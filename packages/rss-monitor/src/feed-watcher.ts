/**
 * packages/rss-monitor/src/feed-watcher.ts
 * Tevad.ro — RSS feed watcher
 *
 * Polls Tier-1 / Tier-2 feeds, classifies each new article (Haiku), queues
 * high-confidence matches for verification.
 *
 * Run: npx tsx packages/rss-monitor/src/feed-watcher.ts
 * Cron: every 30 minutes
 */

import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { classifyArticle } from '@tevad/verifier/models'
import { TIER1_SOURCES, TIER2_SOURCES, getSourceTier } from './sources.config'
import { resolveRecordTypeFromQueue } from './resolve-record-type'

// When running via tsx/cron, Next's env loading won't run automatically.
// Load repo-root `.env` (and optionally `apps/web/.env.local`) so SUPABASE_* and ANTHROPIC_* are available.
{
  const repoRoot = process.cwd()
  const envPaths = [path.join(repoRoot, '.env'), path.join(repoRoot, 'apps', 'web', '.env.local')]
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false })
    }
  }
}

function stripDiacritics(input: string): string {
  // NFD splits accent marks into separate codepoints; then we remove the marks.
  // Also normalize Romanian cedilla variants to comma-below (still removed by NFD strip).
  return input
    .replace(/\u015F/g, '\u0219') // ş -> ș
    .replace(/\u0163/g, '\u021B') // ţ -> ț
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeText(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchText(url: string, opts?: { timeout?: number }): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Some outlets block generic fetch; keep it browser-ish but stable.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Tevad.org RSS Monitor',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(opts?.timeout ?? 8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

function extractExcerptFromHtml(html: string, limit = 500): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function lastNameOf(fullName: string): string | null {
  const norm = normalizeText(fullName)
  if (!norm) return null
  const parts = norm.split(' ').filter(Boolean)
  const last = parts[parts.length - 1]
  if (!last || last.length < 3) return null
  // Basic guard against non-name tokens.
  if (!/^[a-z-]+$/.test(last)) return null
  return last
}

function titleMentionsAnyLastName(title: string, lastNames: Set<string>): boolean {
  const t = normalizeText(title)
  for (const ln of lastNames) {
    // Match name at word-ish boundaries, allowing punctuation (e.g. "Ciolacu:", "Ciolacu," etc).
    // Use ASCII boundaries because we normalize to a-z and spaces/hyphens.
    // eslint-disable-next-line security/detect-non-literal-regexp
    const re = new RegExp(`(^|[^a-z-])${ln}([^a-z-]|$)`)
    if (re.test(t)) return true
  }
  return false
}

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const supabase = createClient(
  getServiceSupabaseUrl(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RssItem {
  title: string
  link: string
  pubDate: string
  description?: string
  content?: string
}

interface FeedResult {
  outlet: string
  domain: string
  tier: 0 | 1 | 2 | null
  items: RssItem[]
}

interface PoliticianRow {
  id: string
  name: string
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1]
      ?? block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?? ''
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
      ?? block.match(/<link[^>]*href="([^"]+)"/)?.[1]
      ?? ''
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? new Date().toISOString()
    const description = block.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1]
      ?? block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
      ?? ''

    if (title && link) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        pubDate: pubDate.trim(),
        description: description.trim(),
      })
    }
  }

  return items
}

async function fetchFeed(outlet: string, domain: string, rssUrl: string): Promise<FeedResult> {
  const tier = getSourceTier(domain)

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Tevad.ro RSS Monitor (contact: open@tevad.ro)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn(`[rss] ${outlet}: HTTP ${res.status}`)
      return { outlet, domain, tier, items: [] }
    }

    const xml = await res.text()
    const items = parseRss(xml)
    console.log(`[rss] ${outlet}: ${items.length} items`)
    return { outlet, domain, tier, items }
  } catch (e) {
    console.warn(`[rss] ${outlet}: fetch failed —`, (e as Error).message)
    return { outlet, domain, tier, items: [] }
  }
}

async function loadPoliticians(): Promise<PoliticianRow[]> {
  const { data } = await supabase.from('politicians').select('id, name').eq('is_active', true)
  return data ?? []
}

async function urlSeen(url: string): Promise<boolean> {
  const { data: src } = await supabase.from('sources').select('id').eq('url', url).maybeSingle()
  if (src) return true
  const { data: q } = await supabase
    .from('verification_queue')
    .select('id')
    .eq('article_url', url)
    .maybeSingle()
  return !!q
}

function resolvePoliticianId(rows: PoliticianRow[], matched: string | null): string | null {
  if (!matched) return null
  const t = normalizeText(matched)
  for (const p of rows) {
    if (normalizeText(p.name) === t) return p.id
  }
  for (const p of rows) {
    const n = normalizeText(p.name)
    if (t.includes(n) || n.includes(t)) return p.id
  }
  return null
}

async function queueArticle(
  item: RssItem,
  outlet: string,
  tier: number | null,
  politicianId: string,
  recordType: 'promise' | 'statement' | 'vote',
  topic: string | null,
  extractedQuote: string | null,
  confidence: number
): Promise<boolean> {
  let pubDate: string | null = null
  const d = new Date(item.pubDate)
  if (!Number.isNaN(d.getTime())) pubDate = d.toISOString()

  const { error } = await supabase.from('verification_queue').insert({
    politician_id: politicianId,
    article_url: item.link,
    article_title: item.title,
    outlet,
    tier: tier ?? undefined,
    record_type: recordType,
    topic,
    extracted_quote: extractedQuote,
    confidence,
    pub_date: pubDate,
  })

  if (error) {
    if (error.code === '23505') return false
    console.warn(`[rss] queue insert:`, error.message)
    return false
  }
  console.log(`[rss] Queued (${confidence}%): "${item.title.slice(0, 70)}..." — ${outlet}`)
  return true
}

export async function run() {
  console.log('[rss] Starting feed watch cycle...')

  const politicians = await loadPoliticians()
  const politicianNames = politicians.map(p => p.name)
  const normalizedPoliticians = politicians.map(p => ({ id: p.id, name: p.name, norm: normalizeText(p.name) }))
  const normalizedNameList = normalizedPoliticians.map(p => p.norm)
  const lastNames = new Set<string>()
  for (const p of politicians) {
    const ln = lastNameOf(p.name)
    if (ln) lastNames.add(ln)
  }
  console.log(`[rss] Loaded ${politicians.length} politicians for classifier.`)
  console.log(`[rss] Last-name prefilter: ${lastNames.size} unique last names.`)

  if (!process.env.ANTHROPIC_API_KEY || politicianNames.length === 0) {
    console.warn('[rss] ANTHROPIC_API_KEY or politicians missing — classification skipped.')
    return
  }

  const allSources = [
    ...TIER1_SOURCES.map(s => ({ ...s, tier: 1 as const })),
    ...TIER2_SOURCES.map(s => ({ ...s, tier: 2 as const })),
  ]

  // Netlify/free-tier style limits: keep each run lightweight.
  // Deterministic rotation by time window so repeated invocations distribute coverage.
  const windowMs = 30 * 60 * 1000
  const windowIndex = Number(process.env.RSS_WINDOW_INDEX ?? '') || Math.floor(Date.now() / windowMs)
  const batchSize = Math.max(1, Math.min(8, Number(process.env.RSS_BATCH_SIZE ?? '') || 4))
  const start = allSources.length ? windowIndex % allSources.length : 0
  const selected = allSources.length
    ? Array.from({ length: Math.min(batchSize, allSources.length) }, (_, i) => {
        return allSources[(start + i) % allSources.length]!
      })
    : []

  console.log(
    `[rss] Fetching ${selected.length}/${allSources.length} sources (window=${windowIndex}, start=${start})...`
  )

  const results = await Promise.all(selected.map(s => fetchFeed(s.outlet, s.domain, s.rssUrl)))

  const fetchedTotal = results.reduce((a, f) => a + f.items.length, 0)
  console.log(`[rss] Fetched total items: ${fetchedTotal}`)

  let considered = 0
  let seenSkipped = 0
  let nameHits = 0
  let titlePrefilterHits = 0
  let excerptFetchAttempts = 0
  let excerptFetchOk = 0
  let classifiedOk = 0
  let matchedPoliticianOk = 0
  let queued = 0
  let excerptFetchesUsed = 0

  const maxExcerptFetches = 5
  const maxItemsPerFeed = Math.max(5, Math.min(60, Number(process.env.RSS_MAX_ITEMS ?? '') || 30))

  for (const feed of results) {
    const items = feed.items.slice(0, maxItemsPerFeed)
    if (feed.items.length > items.length) {
      console.log(`[rss] ${feed.outlet}: processing ${items.length}/${feed.items.length} items (RSS_MAX_ITEMS=${maxItemsPerFeed})`)
    }
    for (const item of items) {
      considered++
      if (await urlSeen(item.link)) {
        seenSkipped++
        continue
      }

      let excerpt = (item.description ?? '').slice(0, 1200)

      // If RSS description is empty/too short, fetch article HTML — but only when
      // the *title* mentions a politician last name and we haven't exceeded the cap.
      if (excerpt.length < 50) {
        const hit = titleMentionsAnyLastName(item.title, lastNames)
        if (hit) titlePrefilterHits++
        if (hit && excerptFetchesUsed < maxExcerptFetches) {
          excerptFetchAttempts++
          try {
            excerptFetchesUsed++
            const html = await fetchText(item.link, { timeout: 8000 })
            const extracted = extractExcerptFromHtml(html, 500)
            if (extracted.length > excerpt.length) {
              excerpt = extracted
              excerptFetchOk++
              console.log(`[rss] excerpt fetched (${excerpt.length}ch) for: "${item.title.slice(0, 90)}"`)
            } else {
              console.log(`[rss] excerpt fetch produced too little text for: "${item.title.slice(0, 90)}"`)
            }
          } catch (e) {
            console.warn(`[rss] excerpt fetch failed:`, (e as Error).message)
          }
        }
      }
      const hay = normalizeText(`${item.title} ${excerpt}`)

      // Quick local heuristic: see if any normalized politician name appears in the article text.
      // This is not used for queueing (AI still decides), but helps debug matching/diacritics issues.
      const hitIdx: number[] = []
      for (let i = 0; i < normalizedNameList.length; i++) {
        const n = normalizedNameList[i]!
        if (n.length < 5) continue
        if (hay.includes(n)) hitIdx.push(i)
        if (hitIdx.length >= 12) break
      }
      if (hitIdx.length > 0) {
        nameHits++
      }

      console.log(
        `[rss] Article: "${item.title.slice(0, 120)}" — ${feed.outlet} (tier=${feed.tier ?? 'n/a'})` +
          ` | excerpt=${excerpt.length}ch | nameHits=${hitIdx.length}`
      )
      if (hitIdx.length > 0) {
        const matchedNames = hitIdx
          .map(i => normalizedPoliticians[i]?.name)
          .filter(Boolean)
          .slice(0, 10)
          .join(', ')
        console.log(`[rss] nameHits sample: ${matchedNames}`)
      }

      // Requested logging: show which politician names are checked for this article.
      // Logging all names would be too noisy; we log the count + a stable sample.
      const sampleNames = politicianNames.slice(0, 12).join(' | ')
      console.log(`[rss] classifier candidates: ${politicianNames.length} (sample: ${sampleNames})`)

      let classified = {
        matchedPolitician: null as string | null,
        recordType: null as string | null,
        topic: null as string | null,
        extractedQuote: null as string | null,
        confidence: 0,
      }

      try {
        classified = await classifyArticle(item.title, excerpt, politicianNames)
      } catch (e) {
        console.warn(`[rss] classifyArticle:`, (e as Error).message)
        continue
      }

      if (classified.confidence <= 70) {
        console.log(
          `[rss] classifier: confidence=${classified.confidence} <= 70 — skip (matched="${classified.matchedPolitician ?? ''}")`
        )
        continue
      }
      classifiedOk++

      console.log(
        `[rss] classifier: confidence=${classified.confidence} matched="${classified.matchedPolitician ?? ''}" ` +
          `type="${classified.recordType ?? ''}" topic="${classified.topic ?? ''}"`
      )

      const politicianId = resolvePoliticianId(politicians, classified.matchedPolitician)
      if (!politicianId) {
        console.warn(
          `[rss] resolvePoliticianId failed for matched="${classified.matchedPolitician ?? ''}" ` +
            `(norm="${normalizeText(classified.matchedPolitician ?? '')}")`
        )
        continue
      }
      if (feed.tier === null) {
        console.warn(`[rss] Source tier is null (excluded/unknown): ${feed.outlet} ${feed.domain}`)
        continue
      }
      matchedPoliticianOk++

      const quoteForType = (classified.extractedQuote ?? item.title ?? '').toString().trim()
      const queuedRecordType = resolveRecordTypeFromQueue(classified.recordType, quoteForType)

      const ok = await queueArticle(
        item,
        feed.outlet,
        feed.tier,
        politicianId,
        queuedRecordType,
        classified.topic,
        classified.extractedQuote,
        classified.confidence
      )
      if (ok) queued++
    }
  }

  console.log(
    `[rss] Cycle complete. fetched=${fetchedTotal} considered=${considered} seenSkipped=${seenSkipped} ` +
      `titlePrefilterHits=${titlePrefilterHits} excerptFetches=${excerptFetchOk}/${excerptFetchAttempts} (cap=${maxExcerptFetches}) ` +
      `nameHits=${nameHits} classifiedOk=${classifiedOk} matchedPoliticianOk=${matchedPoliticianOk} queued=${queued}`
  )
}

if (process.argv[1]?.replace(/\\/g, '/').includes('feed-watcher.ts')) {
  run().catch(e => {
    console.error('[rss] Fatal error:', e)
    process.exit(1)
  })
}
