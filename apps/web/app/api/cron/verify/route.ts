import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertCronSecret } from '@/lib/cron-auth'
import { getSourceTier, getLean, TIER0_SOURCES } from '@tevad/rss-monitor/sources.config'
import type { SourceLean } from '@tevad/rss-monitor/sources.config'
import type { CrossCheckInput } from '@tevad/verifier/cross-check'
import { resolveRecordTypeFromQueue } from '@tevad/rss-monitor/resolve-record-type'
import { politicianHasRecordWithArticleUrl } from '@tevad/rss-monitor/article-dedupe'
import { classifyClaim } from '@tevad/verifier/models'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Two Tier-0 official URLs so `passesSourceDiversityCheck` passes even when the article is Tier 2 only. */
function officialContextSources(): CrossCheckInput['sources'] {
  return TIER0_SOURCES.slice(0, 2).map(s => ({
    outlet: s.outlet,
    url: s.scrapeUrl,
    tier: 0 as const,
    lean: s.lean,
    title: s.outlet,
    excerpt: 'Official Romanian government source — procedural context for public-interest statements.',
  }))
}

function tierToDb(t: number): '0' | '1' | '2' {
  if (t === 0) return '0'
  if (t === 1) return '1'
  return '2'
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

function assertVerifyEnv(): NextResponse | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 503 }
    )
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 503 })
  }
  if (!process.env.XAI_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Missing XAI_API_KEY (Grok is part of the verification ensemble)' }, { status: 503 })
  }
  return null
}

function getServiceSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const envDenied = assertVerifyEnv()
  if (envDenied) return envDenied

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(10, Math.max(1, Number(limitRaw) || 3))

  const supabase = getServiceSupabase()

  const { data: queueRows, error: qErr } = await supabase
    .from('verification_queue')
    .select(
      'id, politician_id, article_url, article_title, outlet, tier, record_type, topic, extracted_quote, confidence, pub_date, created_at'
    )
    .order('created_at', { ascending: true })
    .limit(limit)

  if (qErr) {
    console.error('[cron/verify]', qErr)
    return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 })
  }

  if (!queueRows?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: 'verification_queue empty' })
  }

  const { crossCheckVerify, saveCrossCheckResult } = await import('@tevad/verifier/cross-check')
  const { recalcScore, saveScore } = await import('@tevad/verifier/score')

  const results: Array<{ queueId: string; ok: boolean; error?: string; verdict?: string }> = []

  for (const row of queueRows) {
    const queueId = row.id as string
    const politicianId = row.politician_id as string
    let recordId: string | undefined
    try {
      const { data: pol, error: pErr } = await supabase
        .from('politicians')
        .select('id, name')
        .eq('id', politicianId)
        .maybeSingle()
      if (pErr || !pol?.name) throw new Error(pErr?.message || 'politician not found')

      const articleUrl = row.article_url as string
      const host = hostFromUrl(articleUrl)
      const inferredTier = getSourceTier(host)
      const tier =
        typeof row.tier === 'number' && row.tier >= 0 && row.tier <= 2
          ? (row.tier as 0 | 1 | 2)
          : typeof inferredTier === 'number'
            ? inferredTier
            : 2
      const lean = (getLean(host) ?? undefined) as SourceLean | undefined

      const statementText = (row.extracted_quote as string | null)?.trim() || (row.article_title as string)
      const resolvedType = resolveRecordTypeFromQueue(row.record_type as string | null, statementText)
      const pub = row.pub_date || row.created_at
      const dateMade = pub ? new Date(pub as string).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      const slug = `vq-${queueId}`

      const { data: existing } = await supabase.from('records').select('id').eq('slug', slug).maybeSingle()
      if (existing?.id) {
        await supabase.from('verification_queue').delete().eq('id', queueId)
        results.push({ queueId, ok: true, verdict: 'skipped_duplicate_slug' })
        continue
      }

      const dupArticle = await politicianHasRecordWithArticleUrl(supabase, politicianId, articleUrl)
      if (dupArticle) {
        await supabase.from('verification_queue').delete().eq('id', queueId)
        results.push({ queueId, ok: true, verdict: 'skipped_duplicate_article' })
        continue
      }

      const { data: ins, error: iErr } = await supabase
        .from('records')
        .insert({
          politician_id: politicianId,
          slug,
          type: resolvedType,
          text: statementText,
          topic: (row.topic as string | null) ?? null,
          status: 'pending',
          date_made: dateMade,
          impact_level: 'medium',
        })
        .select('id')
        .single()
      if (iErr || !ins) throw new Error(iErr?.message || 'insert record failed')
      recordId = ins.id as string

      const excerpt =
        (row.extracted_quote as string | null)?.trim() ||
        (row.article_title as string).slice(0, 800)

      const primarySource: CrossCheckInput['sources'][0] = {
        outlet: (row.outlet as string) || host || 'Article',
        url: articleUrl,
        tier,
        lean,
        title: row.article_title as string,
        excerpt,
        publishedAt: row.pub_date ? new Date(row.pub_date as string).toISOString() : undefined,
      }

      const crossSources: CrossCheckInput['sources'] = [primarySource, ...officialContextSources()]

      for (const s of crossSources) {
        const { error: sErr } = await supabase.from('sources').insert({
          record_id: recordId,
          tier: tierToDb(s.tier),
          outlet: s.outlet,
          url: s.url,
          title: s.title ?? null,
          published_at: s.publishedAt ? s.publishedAt.slice(0, 10) : null,
        })
        if (sErr) throw new Error(`source insert: ${sErr.message}`)
      }

      const input: CrossCheckInput = {
        politicianName: pol.name,
        politicianId,
        statementText,
        statementDate: dateMade,
        statementType: resolvedType,
        sources: crossSources,
      }

      const result = await crossCheckVerify(input)
      await saveCrossCheckResult(recordId, politicianId, result, crossSources)

      // Non-editorial annotation: claim-kind + measurability + suggested type.
      try {
        const ann = await classifyClaim({
          type: resolvedType,
          text: statementText,
          date: dateMade,
        })
        await supabase.from('record_ai_annotations').insert({
          record_id: recordId,
          politician_id: politicianId,
          claim_kind: ann.claim_kind,
          measurability: ann.measurability,
          suggested_type: ann.suggested_type,
          confidence: ann.confidence,
          reasoning: ann.reasoning,
          model_version: ann.model_version,
        } as any)
      } catch (e) {
        console.warn('[cron/verify] classifyClaim failed:', (e as Error).message)
      }

      const components = await recalcScore(politicianId)
      await saveScore(politicianId, components, 'verification_queue_cron', recordId, { skipReasonExplain: true })

      const { error: delErr } = await supabase.from('verification_queue').delete().eq('id', queueId)
      if (delErr) console.warn('[cron/verify] queue delete:', delErr.message)

      results.push({ queueId, ok: true, verdict: result.finalVerdict })
    } catch (e) {
      const msg = (e as Error).message
      console.error('[cron/verify] item', queueId, msg)
      if (recordId) {
        const { error: delRec } = await supabase.from('records').delete().eq('id', recordId)
        if (delRec) console.warn('[cron/verify] cleanup record:', delRec.message)
      }
      results.push({ queueId, ok: false, error: msg })
    }
  }

  const okCount = results.filter(r => r.ok).length
  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: okCount,
    failed: results.length - okCount,
    results,
    at: new Date().toISOString(),
  })
}
