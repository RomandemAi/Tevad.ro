/**
 * Pending promise resolver: match RSS queue / web search to pending promises,
 * dual-model verify, update original record + audit log + attach new sources.
 *
 * Run: npx tsx packages/verifier/src/resolve-pending.ts
 * Env: VERIFY_WEB_SEARCH=1 enables implementation web search (same as verify.ts).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { fetchText } from '../../scraper/src/fetch-text'
import { getLean, getSourceTier } from '../../rss-monitor/src/sources.config'
import type { SourceLean } from '../../rss-monitor/src/sources.config'
import { crossCheckVerify, saveCrossCheckResult, type CrossCheckInput } from './cross-check'
import { enrichWithCustomWebSearchQuery } from './web-search-enrich'

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'apps/web/.env.local'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[k] === undefined) process.env[k] = v
    }
    console.log('[resolve-pending] Loaded env from', p)
    return
  }
}

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase() {
  const url = getServiceSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

const STOPWORDS = new Set(
  `cel aceasta acest acesta aceste acești vor fi fost sunt era pentru că ca și sau din în la de le te se un o unei unui
  românia romania europarlamentar senator deputat prim ministru guvernul țara țară`.split(/\s+/)
)

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^a-zA-Z0-9ĂÂÎȘȚăâîșț\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 3 && !STOPWORDS.has(w.toLowerCase()))
  return Array.from(new Set(words)).slice(0, 14)
}

function matchScore(blob: string, keywords: string[]): number {
  const b = blob.toLowerCase()
  return keywords.reduce((n, k) => n + (b.includes(k.toLowerCase()) ? 1 : 0), 0)
}

function tierToDb(t: number): '0' | '1' | '2' {
  if (t === 0) return '0'
  if (t === 1) return '1'
  return '2'
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return 'source'
  }
}

async function excerptFromUrl(url: string): Promise<string | undefined> {
  try {
    const html = await fetchText(url, { timeout: 8000 })
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000)
  } catch {
    return undefined
  }
}

function mapDbSourceToInput(s: {
  url: string
  outlet: string
  tier: string | number
  title?: string | null
  excerpt?: string | null
  published_at?: string | null
}): CrossCheckInput['sources'][0] {
  const url = String(s.url || '')
  const inferred = getSourceTier(url)
  const tierNum =
    typeof inferred === 'number'
      ? inferred
      : s.tier === '0' || s.tier === '1' || s.tier === '2'
        ? Number(s.tier)
        : 2
  return {
    outlet: String(s.outlet || 'Source'),
    url,
    tier: tierNum,
    lean: (getLean(url) ?? undefined) as SourceLean | undefined,
    title: s.title ?? undefined,
    excerpt: s.excerpt ? String(s.excerpt) : undefined,
    publishedAt: s.published_at ? String(s.published_at) : undefined,
  }
}

export async function runResolvePending(options?: { limit?: number }): Promise<{
  processed: number
  skipped: number
  errors: number
}> {
  loadEnvFiles()
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('Missing ANTHROPIC_API_KEY')
  if (!process.env.XAI_API_KEY?.trim()) throw new Error('Missing XAI_API_KEY (Grok is part of the verification ensemble)')

  const limit = Math.min(20, Math.max(1, options?.limit ?? (Number(process.env.VERIFY_RESOLVE_LIMIT) || 5)))
  const supabase = getServiceSupabase()
  const { recalcScore, saveScore } = await import('./score')

  const { data: pending, error: pErr } = await supabase
    .from('records')
    .select('id, politician_id, slug, text, date_made, type, status, opinion_exempt')
    .eq('status', 'pending')
    .eq('type', 'promise')
    .eq('opinion_exempt', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (pErr) throw new Error(pErr.message)
  if (!pending?.length) {
    console.log('[resolve-pending] No pending promises.')
    return { processed: 0, skipped: 0, errors: 0 }
  }

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const rec of pending) {
    const recordId = rec.id as string
    const slug = (rec.slug as string) || recordId
    const politicianId = rec.politician_id as string

    try {
      const keywords = extractKeywords(rec.text as string)
      if (keywords.length === 0) {
        skipped++
        continue
      }

      const threshold = Math.min(2, keywords.length)

      const { data: pol, error: polErr } = await supabase
        .from('politicians')
        .select('id, name, role')
        .eq('id', politicianId)
        .maybeSingle()
      if (polErr || !pol) {
        skipped++
        continue
      }

      const { data: existingRows } = await supabase
        .from('sources')
        .select('url, outlet, tier, title, published_at, excerpt')
        .eq('record_id', recordId)

      const initialUrls = new Set((existingRows ?? []).map((r: { url: string }) => r.url))
      const seen = new Set(initialUrls)
      const evidence: CrossCheckInput['sources'] = (existingRows ?? []).map((r: any) => mapDbSourceToInput(r))
      let hasNew = false

      const { data: queueRows } = await supabase
        .from('verification_queue')
        .select('article_url, article_title, outlet, tier, topic, extracted_quote, pub_date')
        .eq('politician_id', politicianId)
        .order('created_at', { ascending: false })
        .limit(120)

      for (const row of queueRows ?? []) {
        const blob = [row.article_title, row.extracted_quote, row.topic].filter(Boolean).join(' ')
        if (matchScore(blob, keywords) < threshold) continue
        const url = String(row.article_url)
        if (seen.has(url)) continue
        if (!initialUrls.has(url)) hasNew = true
        const tier =
          typeof row.tier === 'number' && row.tier >= 0 && row.tier <= 2
            ? row.tier
            : (getSourceTier(url) ?? 2)
        let ex = row.extracted_quote ? String(row.extracted_quote).slice(0, 1200) : undefined
        if (!ex) ex = await excerptFromUrl(url)
        evidence.push({
          outlet: String(row.outlet || safeHost(url)),
          url,
          tier,
          lean: (getLean(url) ?? undefined) as SourceLean | undefined,
          title: String(row.article_title),
          excerpt: ex,
          publishedAt: row.pub_date ? new Date(row.pub_date as string).toISOString().slice(0, 10) : undefined,
        })
        seen.add(url)
      }

      const year = String(rec.date_made).slice(0, 4)
      const implQuery = `${keywords.slice(0, 8).join(' ')} Romania ${year} rezultate implementare`
      const web = await enrichWithCustomWebSearchQuery(pol.name as string, implQuery)
      for (const s of web.sources) {
        if (seen.has(s.url)) continue
        const tier = getSourceTier(s.url) ?? 2
        if (tier > 1) continue
        if (!initialUrls.has(s.url)) hasNew = true
        evidence.push({
          outlet: safeHost(s.url),
          url: s.url,
          tier,
          lean: (getLean(s.url) ?? undefined) as SourceLean | undefined,
          title: s.title,
          excerpt: s.excerpt,
          publishedAt: s.publishedAt ?? undefined,
        })
        seen.add(s.url)
      }

      if (!hasNew) {
        console.log('[resolve-pending] skip (no new evidence):', slug)
        skipped++
        continue
      }

      console.log('[resolve-pending] verifying:', slug, 'sources:', evidence.length)

      const result = await crossCheckVerify({
        politicianName: pol.name as string,
        politicianId,
        statementText: rec.text as string,
        statementDate: String(rec.date_made),
        statementType: 'promise',
        sources: evidence,
      })

      await saveCrossCheckResult(recordId, politicianId, result, evidence)

      for (const s of evidence) {
        if (initialUrls.has(s.url)) continue
        const { error: insErr } = await supabase.from('sources').insert({
          record_id: recordId,
          tier: tierToDb(s.tier),
          outlet: s.outlet,
          url: s.url,
          title: s.title ?? null,
          excerpt: s.excerpt ? s.excerpt.slice(0, 4000) : null,
          published_at: s.publishedAt ? s.publishedAt.slice(0, 10) : null,
        })
        if (insErr) console.warn('[resolve-pending] source insert:', insErr.message)
      }

      const components = await recalcScore(politicianId)
      await saveScore(politicianId, components, 'resolve_pending_promise', recordId, { skipReasonExplain: true })

      processed++
      console.log(`[resolve-pending] ✓ ${slug} → ${result.finalVerdict}`)
    } catch (e) {
      errors++
      console.error('[resolve-pending] error', slug, e)
    }
  }

  console.log(`[resolve-pending] Done. processed=${processed} skipped=${skipped} errors=${errors}`)
  return { processed, skipped, errors }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('resolve-pending')) {
  runResolvePending().catch(err => {
    console.error('[resolve-pending] Fatal:', err)
    process.exit(1)
  })
}
