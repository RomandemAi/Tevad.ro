/**
 * packages/rss-monitor/src/feed-watcher.ts
 * Tevad.ro — RSS feed watcher
 *
 * Polls all Tier-1 and Tier-2 RSS feeds for new articles
 * mentioning tracked politicians. Flags potential records
 * for AI verification.
 *
 * Run: npx tsx packages/rss-monitor/src/feed-watcher.ts
 * Cron: every 30 minutes
 */

import { createClient } from '@supabase/supabase-js'
import { TIER1_SOURCES, TIER2_SOURCES, getSourceTier } from './sources.config'

const supabase = createClient(
  process.env.SUPABASE_URL!,
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

// Simple RSS parser — no external deps
function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title = block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1]
      ?? block.match(/<title[^>]*>(.*?)<\/title>/s)?.[1]
      ?? ''
    const link = block.match(/<link[^>]*>(.*?)<\/link>/s)?.[1]
      ?? block.match(/<link[^>]*href="([^"]+)"/)?.[1]
      ?? ''
    const pubDate = block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s)?.[1] ?? new Date().toISOString()
    const description = block.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1]
      ?? block.match(/<description[^>]*>(.*?)<\/description>/s)?.[1]
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
        'Accept': 'application/rss+xml, application/xml, text/xml',
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

async function loadPoliticianNames(): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('politicians')
    .select('id, name')
    .eq('is_active', true)

  const map = new Map<string, string>()
  for (const pol of data ?? []) {
    // Index by last name for matching
    const lastName = pol.name.split(' ').pop()?.toLowerCase() ?? ''
    if (lastName.length > 3) map.set(lastName, pol.id)
  }
  return map
}

function mentionsPolitician(text: string, names: Map<string, string>): string | null {
  const lower = text.toLowerCase()
  for (const [lastName, id] of names) {
    if (lower.includes(lastName)) return id
  }
  return null
}

async function flagForVerification(
  item: RssItem,
  outlet: string,
  tier: number,
  politicianId: string
): Promise<void> {
  // Check if we've already seen this URL
  const { data: existing } = await supabase
    .from('sources')
    .select('id')
    .eq('url', item.link)
    .single()

  if (existing) return // Already indexed

  console.log(`[rss] Flagging: "${item.title.slice(0, 60)}..." — ${outlet} (Tier ${tier})`)

  // In a full implementation, this would queue for AI verification
  // For now, we log and could insert into a pending_verification table
  // The verify.ts pipeline picks these up
}

async function run() {
  console.log('[rss] Starting feed watch cycle...')

  const allSources = [
    ...TIER1_SOURCES.map(s => ({ ...s, tier: 1 as const })),
    ...TIER2_SOURCES.map(s => ({ ...s, tier: 2 as const })),
  ]

  // Load politician names for mention matching
  const politicianNames = await loadPoliticianNames()
  console.log(`[rss] Loaded ${politicianNames.size} politician names for matching`)

  // Fetch all feeds in parallel
  const results = await Promise.all(
    allSources.map(s => fetchFeed(s.outlet, s.domain, s.rssUrl))
  )

  let flagged = 0
  for (const feed of results) {
    for (const item of feed.items) {
      const searchText = `${item.title} ${item.description ?? ''}`
      const politicianId = mentionsPolitician(searchText, politicianNames)

      if (politicianId && feed.tier !== null) {
        await flagForVerification(item, feed.outlet, feed.tier, politicianId)
        flagged++
      }
    }
  }

  console.log(`[rss] Cycle complete. ${flagged} items flagged for review.`)
}

run().catch(e => {
  console.error('[rss] Fatal error:', e)
  process.exit(1)
})
