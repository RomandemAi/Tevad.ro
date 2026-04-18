import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'
import { getSourceTier, getLean, TIER0_SOURCES } from '@tevad/rss-monitor/sources.config'
import type { SourceLean } from '@tevad/rss-monitor/sources.config'
import type { CrossCheckInput } from '@tevad/verifier/cross-check'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function getServiceSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
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

/**
 * Re-runs 3-model verification for records that already have ai_verified_at but no plain_summary
 * (schema upgrade / prompt v1.4.0). Same pattern as reverify-sources.
 */
export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 503 })
  }
  if (!process.env.XAI_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Missing XAI_API_KEY' }, { status: 503 })
  }

  const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 8)))

  const supabase = getServiceSupabase()

  const { data: recs, error: rErr } = await supabase
    .from('records')
    .select('id, politician_id, text, type, date_made, status')
    .not('ai_verified_at', 'is', null)
    .is('plain_summary', null)
    .eq('opinion_exempt', false)
    .order('ai_verified_at', { ascending: false })
    .limit(80)

  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 })

  const candidates = (recs ?? []).slice(0, limit)
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      ran: 'backfill-ai-transparency',
      processed: 0,
      at: new Date().toISOString(),
    })
  }

  const { crossCheckVerify, saveCrossCheckResult } = await import('@tevad/verifier/cross-check')
  const { recalcScore, saveScore } = await import('@tevad/verifier/score')

  const results: Array<{ recordId: string; ok: boolean; verdict?: string; error?: string }> = []

  for (const r of candidates) {
    const recordId = String(r.id)
    const politicianId = String(r.politician_id)
    try {
      const { data: pol, error: pErr } = await supabase
        .from('politicians')
        .select('id, name')
        .eq('id', politicianId)
        .maybeSingle()
      if (pErr || !pol?.name) throw new Error(pErr?.message || 'politician not found')

      const { data: srcRows } = await supabase
        .from('sources')
        .select('outlet, url, tier, title, published_at, excerpt')
        .eq('record_id', recordId)

      const sources = (srcRows ?? []).map((s: any) => {
        const url = String(s.url || '')
        const host = hostFromUrl(url)
        const inferredTier = getSourceTier(host)
        const tierNum =
          typeof inferredTier === 'number'
            ? inferredTier
            : s.tier === '0' || s.tier === '1' || s.tier === '2'
              ? Number(s.tier)
              : 2
        const lean = (getLean(host) ?? undefined) as SourceLean | undefined
        return {
          outlet: String(s.outlet || 'Source'),
          url,
          tier: tierNum,
          lean,
          title: s.title ?? undefined,
          excerpt: s.excerpt ? String(s.excerpt) : undefined,
          publishedAt: s.published_at ? String(s.published_at) : undefined,
        }
      })

      const crossSources = [...sources, ...officialContextSources()]

      const input: CrossCheckInput = {
        politicianName: pol.name,
        politicianId,
        statementText: String(r.text || ''),
        statementDate: String(r.date_made || new Date().toISOString().slice(0, 10)),
        statementType: (r.type === 'promise' || r.type === 'statement' || r.type === 'vote' ? r.type : 'statement') as
          | 'promise'
          | 'statement'
          | 'vote',
        sources: crossSources,
      }

      const cc = await crossCheckVerify(input)
      await saveCrossCheckResult(recordId, politicianId, cc, crossSources)

      const components = await recalcScore(politicianId)
      await saveScore(politicianId, components, 'backfill_ai_transparency', recordId, { skipReasonExplain: true })

      results.push({ recordId, ok: true, verdict: cc.finalVerdict })
    } catch (e) {
      results.push({ recordId, ok: false, error: (e as Error).message })
    }
  }

  return NextResponse.json({
    ok: true,
    ran: 'backfill-ai-transparency',
    candidates: candidates.length,
    processed: results.length,
    results,
    at: new Date().toISOString(),
  })
}
