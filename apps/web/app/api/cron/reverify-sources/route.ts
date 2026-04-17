import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'
import { getSourceTier, getLean, TIER0_SOURCES } from '@tevad/rss-monitor/sources.config'
import type { SourceLean } from '@tevad/rss-monitor/sources.config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase() {
  const url = getServiceSupabaseUrl().trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function tierToDb(t: number): '0' | '1' | '2' {
  if (t === 0) return '0'
  if (t === 1) return '1'
  return '2'
}

/** Two Tier-0 official URLs so diversity check has official context. */
function officialContextSources() {
  return TIER0_SOURCES.slice(0, 2).map(s => ({
    outlet: s.outlet,
    url: s.scrapeUrl,
    tier: 0 as const,
    lean: s.lean,
    title: s.outlet,
    excerpt: 'Official Romanian government source — procedural context for public-interest statements.',
  }))
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const limit = Math.min(25, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 10)))

  const supabase = getServiceSupabase()

  const now = new Date()
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Find verified records older than 30 days with <2 sources.
  // (Tank-proof rule: Minimum 2 sources after 30 days → auto-pending re-verification.)
  const { data: recs, error: rErr } = await supabase
    .from('records')
    .select('id, politician_id, text, type, date_made, sources(id)')
    .in('status', ['true', 'false', 'partial'])
    .lte('date_made', cutoff)
    .limit(200)

  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 })

  const candidates = (recs ?? [])
    .map((r: any) => ({ ...r, sourceCount: Array.isArray(r.sources) ? r.sources.length : 0 }))
    .filter((r: any) => r.sourceCount < 2)
    .slice(0, limit)

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, ran: 'reverify-sources', queued: 0, at: new Date().toISOString() })
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

      // Pull current sources (likely 0-1) and add 2 official context sources.
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
      // Ensure official sources exist in DB too (for audit clarity).
      for (const s of officialContextSources()) {
        await supabase.from('sources').insert({
          record_id: recordId,
          tier: tierToDb(s.tier),
          outlet: s.outlet,
          url: s.url,
          title: s.title ?? null,
          published_at: null,
        } as any)
      }

      const input = {
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

      // Force record back to pending prior to recheck for transparency.
      await supabase.from('records').update({ status: 'pending' }).eq('id', recordId)

      const cc = await crossCheckVerify(input)
      await saveCrossCheckResult(recordId, politicianId, cc, crossSources)

      const components = await recalcScore(politicianId)
      await saveScore(politicianId, components, 'reverify_sources', recordId, { skipReasonExplain: true })

      results.push({ recordId, ok: true, verdict: cc.finalVerdict })
    } catch (e) {
      results.push({ recordId, ok: false, error: (e as Error).message })
    }
  }

  return NextResponse.json({
    ok: true,
    ran: 'reverify-sources',
    candidates: candidates.length,
    processed: results.length,
    results,
    at: new Date().toISOString(),
  })
}

