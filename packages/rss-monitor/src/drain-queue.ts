/**
 * packages/rss-monitor/src/drain-queue.ts
 *
 * Local/ops helper: drain `verification_queue` into `records` (pending) and run the
 * dual-model blind verifier, mirroring the `/api/cron/verify` route behavior.
 *
 * Run:
 *   npm run rss:drain -- --limit 10
 */
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { getLean, getSourceTier, TIER0_SOURCES } from './sources.config'
import type { SourceLean } from './sources.config'
import type { CrossCheckInput } from '@tevad/verifier/cross-check'
import { resolveRecordTypeFromQueue } from './resolve-record-type'

// Load repo `.env` (and optionally apps/web/.env.local)
{
  const repoRoot = process.cwd()
  const envPaths = [path.join(repoRoot, '.env'), path.join(repoRoot, 'apps', 'web', '.env.local')]
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false })
    }
  }
}

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

function getSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  return createClient<any, 'public', any>(url, key, { auth: { persistSession: false } })
}

export async function run(opts: { limit?: number } = {}) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('Missing ANTHROPIC_API_KEY')

  const limit = Math.min(25, Math.max(1, Number(opts.limit) || 10))
  const supabase = getSupabase()

  const { crossCheckVerify, saveCrossCheckResult } = await import('@tevad/verifier/cross-check')
  const { recalcScore, saveScore } = await import('@tevad/verifier/score')

  const { data: queueRows, error: qErr } = await supabase
    .from('verification_queue')
    .select(
      'id, politician_id, article_url, article_title, outlet, tier, record_type, topic, extracted_quote, confidence, pub_date, created_at'
    )
    .order('created_at', { ascending: true })
    .limit(limit)

  if (qErr) throw new Error(qErr.message)
  if (!queueRows?.length) {
    console.log('[rss:drain] verification_queue empty')
    return { processed: 0 }
  }

  const results: Array<{ queueId: string; ok: boolean; verdict?: string; error?: string }> = []

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

      const components = await recalcScore(politicianId)
      await saveScore(politicianId, components, 'rss_drain_queue', recordId, { skipReasonExplain: true })

      const { error: delErr } = await supabase.from('verification_queue').delete().eq('id', queueId)
      if (delErr) console.warn('[rss:drain] queue delete:', delErr.message)

      results.push({ queueId, ok: true, verdict: result.finalVerdict })
      console.log(`[rss:drain] ✓ ${queueId} → ${result.finalVerdict} (${result.primaryConfidence}%)`)
    } catch (e) {
      const msg = (e as Error).message
      console.error('[rss:drain] ✗', queueId, msg)
      if (recordId) {
        const { error: delRec } = await supabase.from('records').delete().eq('id', recordId)
        if (delRec) console.warn('[rss:drain] cleanup record:', delRec.message)
      }
      results.push({ queueId, ok: false, error: msg })
    }
  }

  const okCount = results.filter(r => r.ok).length
  console.log(`[rss:drain] Done. processed=${results.length} ok=${okCount} failed=${results.length - okCount}`)
  return { processed: results.length, ok: okCount, failed: results.length - okCount, results }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('drain-queue.ts')) {
  const i = process.argv.indexOf('--limit')
  const limit = i >= 0 ? Number(process.argv[i + 1]) : undefined
  run({ limit }).catch(e => {
    console.error('[rss:drain] failed:', e)
    process.exit(1)
  })
}

