/**
 * packages/rss-monitor/src/feed-watcher.ts
 * Tevad.ro — Tier-1 RSS feed monitor
 *
 * Watches RSS feeds from Recorder.ro, HotNews.ro, G4Media.ro
 * for new articles mentioning tracked politicians.
 * Flagged articles are queued for Claude AI verification.
 *
 * Run: npx tsx packages/rss-monitor/src/feed-watcher.ts
 * Cron: every 30 minutes
 */

import { createClient } from '@supabase/supabase-js'
import { TIER1_SOURCES, TIER2_SOURCES } from './sources.config'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RSSItem {
  title: string
  link: string
  pubDate: string
  description?: string
  outlet: string
  tier: number
}

interface FlaggedArticle {
  politicianId: string
  politicianName: string
  article: RSSItem
  matchContext: string
}

// Simple RSS XML parser (no external deps)
function parseRSS(xml: string, outlet: string, tier: number): RSSItem[] {
  const items: RSSItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]
    const title = item.match(/<title><!\[CDATA\[([^\]]+)\]\]>/)?.[1]
      ?? item.match(/<title>([^<]+)<\/title>/)?.[1]
      ?? ''
    const link = item.match(/<link>([^<]+)<\/link>/)?.[1]
      ?? item.match(/<guid>([^<]+)<\/guid>/)?.[1]
      ?? ''
    const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? ''
    const description = item.match(/<description><!\[CDATA\[([^\]]+)\]\]>/)?.[1]
      ?? item.match(/<description>([^<]+)<\/description>/)?.[1]
      ?? ''

    if (title && link) {
      items.push({ title: title.trim(), link: link.trim(), pubDate, description, outlet, tier })
    }
  }

  return items
}

async function fetchFeed(url: string, outlet: string, tier: number): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Tevad.ro RSS Monitor (contact: open@tevad.ro)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`[rss] ${outlet} returned ${res.status}`)
      return []
    }

    const xml = await res.text()
    const items = parseRSS(xml, outlet, tier)
    console.log(`[rss] ${outlet}: ${items.length} items`)
    return items
  } catch (e) {
    console.error(`[rss] Failed to fetch ${outlet}:`, e)
    return []
  }
}

async function loadPoliticians(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await supabase
    .from('politicians')
    .select('id, name, slug')
    .eq('is_active', true)

  if (error) throw error
  return data ?? []
}

function articleMentionsPolitician(
  item: RSSItem,
  politician: { name: string }
): string | null {
  const text = `${item.title} ${item.description ?? ''}`.toLowerCase()
  const nameParts = politician.name.toLowerCase().split(' ')

  // Match on last name (minimum 4 chars to avoid false positives)
  for (const part of nameParts) {
    if (part.length >= 4 && text.includes(part)) {
      return part
    }
  }

  // Full name match
  if (text.includes(politician.name.toLowerCase())) {
    return politician.name
  }

  return null
}

async function isAlreadyProcessed(url: string): Promise<boolean> {
  const { data } = await supabase
    .from('sources')
    .select('id')
    .eq('url', url)
    .limit(1)
    .single()
  return !!data
}

async function queueForVerification(flagged: FlaggedArticle): Promise<void> {
  console.log(`[rss] Queuing: "${flagged.article.title}" re: ${flagged.politicianName}`)

  // Store in a verification queue table (or call verifier directly)
  // For now, log to console — verifier pipeline picks this up
  const payload = {
    politician_id: flagged.politicianId,
    politician_name: flagged.politicianName,
    article_title: flagged.article.title,
    article_url: flagged.article.link,
    outlet: flagged.article.outlet,
    tier: flagged.article.tier,
    pub_date: flagged.article.pubDate,
    match_context: flagged.matchContext,
    queued_at: new Date().toISOString(),
    status: 'pending_verification',
  }

  // TODO: insert into verification_queue table (Phase 03)
  console.log('[rss] Payload:', JSON.stringify(payload, null, 2))
}

async function run() {
  console.log('[rss] Starting feed watcher...')
  console.log(`[rss] Monitoring ${TIER1_SOURCES.length} Tier-1 + ${TIER2_SOURCES.length} Tier-2 sources`)

  // Load all active politicians
  const politicians = await loadPoliticians()
  console.log(`[rss] Tracking ${politicians.length} politicians`)

  // Fetch all feeds
  const allSources = [
    ...TIER1_SOURCES.map(s => ({ ...s, tier: 1 })),
    ...TIER2_SOURCES.map(s => ({ ...s, tier: 2 })),
  ]

  const allItems: RSSItem[] = []
  for (const source of allSources) {
    const items = await fetchFeed(source.rssUrl, source.outlet, source.tier)
    allItems.push(...items)
    await new Promise(r => setTimeout(r, 300)) // polite delay
  }

  console.log(`[rss] Total articles fetched: ${allItems.length}`)

  // Cross-reference articles against politicians
  const flagged: FlaggedArticle[] = []
  let processed = 0

  for (const item of allItems) {
    // Skip if already in our sources table
    if (await isAlreadyProcessed(item.link)) continue
    processed++

    for (const politician of politicians) {
      const match = articleMentionsPolitician(item, politician)
      if (match) {
        flagged.push({
          politicianId: politician.id,
          politicianName: politician.name,
          article: item,
          matchContext: match,
        })
        break // One politician per article for initial queue
      }
    }
  }

  console.log(`[rss] Checked ${processed} new articles`)
  console.log(`[rss] Flagged ${flagged.length} articles for verification`)

  for (const f of flagged) {
    await queueForVerification(f)
  }

  console.log('[rss] Feed watch complete.')
}

run().catch(e => {
  console.error('[rss] Fatal error:', e)
  process.exit(1)
})
