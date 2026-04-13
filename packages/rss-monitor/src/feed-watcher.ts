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

import { createClient } from '@supabase/supabase-js'
import { classifyArticle } from '@tevad/verifier/models'
import { TIER1_SOURCES, TIER2_SOURCES, getSourceTier } from './sources.config'

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
  const t = matched.trim().toLowerCase()
  for (const p of rows) {
    if (p.name.trim().toLowerCase() === t) return p.id
  }
  for (const p of rows) {
    const n = p.name.trim().toLowerCase()
    if (t.includes(n) || n.includes(t)) return p.id
  }
  return null
}

function normalizeRecordType(v: string | null): string | null {
  if (!v || v === 'null') return null
  if (v === 'promise' || v === 'statement' || v === 'vote') return v
  return null
}

async function queueArticle(
  item: RssItem,
  outlet: string,
  tier: number | null,
  politicianId: string,
  recordType: string | null,
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
  console.log(`[rss] Loaded ${politicians.length} politicians for classifier.`)

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
  const windowIndex = Math.floor(Date.now() / windowMs)
  const batchSize = 2
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

  let queued = 0
  for (const feed of results) {
    for (const item of feed.items) {
      if (await urlSeen(item.link)) continue

      const excerpt = (item.description ?? '').slice(0, 1200)
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

      if (classified.confidence <= 70) continue

      const politicianId = resolvePoliticianId(politicians, classified.matchedPolitician)
      if (!politicianId || feed.tier === null) continue

      const ok = await queueArticle(
        item,
        feed.outlet,
        feed.tier,
        politicianId,
        normalizeRecordType(classified.recordType),
        classified.topic,
        classified.extractedQuote,
        classified.confidence
      )
      if (ok) queued++
    }
  }

  console.log(`[rss] Cycle complete. ${queued} article(s) queued for verification.`)
}

if (process.argv[1]?.replace(/\\/g, '/').includes('feed-watcher.ts')) {
  run().catch(e => {
    console.error('[rss] Fatal error:', e)
    process.exit(1)
  })
}
