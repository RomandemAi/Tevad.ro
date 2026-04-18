import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'
import { TIER1_SOURCES, TIER2_SOURCES, getSourceTier } from '@tevad/rss-monitor/sources.config'
import { run as runFeedWatcher } from '@tevad/rss-monitor/feed-watcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase() {
  return createClient(getServiceSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

function assertRssEnv(): NextResponse | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url) {
    return NextResponse.json(
      {
        error: 'SUPABASE_URL not configured',
        hint: 'Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in repo-root .env.local and restart dev.',
      },
      { status: 503 }
    )
  }
  if (!key) {
    return NextResponse.json(
      {
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured',
        hint: 'The RSS watcher needs the service role key (server-only). Add it to .env.local and restart dev.',
      },
      { status: 503 }
    )
  }
  return null
}

function qInt(
  sp: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = sp.get(key)
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

type RssItem = { title: string; link: string; pubDate: string; description?: string }

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title =
      block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ??
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
      ''
    const link =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
      block.match(/<link[^>]*href="([^"]+)"/)?.[1] ??
      ''
    const pubDate =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? new Date().toISOString()
    const description =
      block.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      ''
    if (title && link) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim(), description })
  }
  return items
}

async function pickNextFeed(supabase: ReturnType<typeof getServiceSupabase>) {
  const allSources = [...TIER1_SOURCES, ...TIER2_SOURCES]
  const { data, error } = await supabase
    .from('cron_state')
    .select('value')
    .eq('key', 'rss_watch_index')
    .maybeSingle()
  const idx = Number(data?.value ?? 0) || 0
  const nextIdx = allSources.length ? (idx + 1) % allSources.length : 0
  if (!error) {
    await supabase
      .from('cron_state')
      .upsert({ key: 'rss_watch_index', value: String(nextIdx), updated_at: new Date().toISOString() })
  }
  const chosen = allSources.length ? allSources[idx % allSources.length]! : null
  return { chosen, idx, total: allSources.length }
}

async function urlSeen(supabase: ReturnType<typeof getServiceSupabase>, url: string): Promise<boolean> {
  const { data: src } = await supabase.from('sources').select('id').eq('url', url).maybeSingle()
  if (src) return true
  const { data: q } = await supabase.from('verification_queue').select('id').eq('article_url', url).maybeSingle()
  return !!q
}

/** Legacy one-feed / no-LLM path (use `?mode=lite` to force). */
async function runLite(supabase: ReturnType<typeof getServiceSupabase>) {
  const { chosen, idx, total } = await pickNextFeed(supabase)
  if (!chosen) return { ok: true as const, queued: 0, reason: 'no sources configured' as const }

  const res = await fetch(chosen.rssUrl, {
    headers: {
      'User-Agent': 'Tevad.org RSS Monitor (cron)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(8_000),
  })
  const xml = res.ok ? await res.text() : ''
  const items = xml ? parseRss(xml) : []

  const { data: politicians } = await supabase.from('politicians').select('id, name').eq('is_active', true)
  const pols = politicians ?? []

  const MAX_ITEMS = 5
  let processed = 0
  let queued = 0
  for (const item of items.slice(0, MAX_ITEMS)) {
    processed++
    if (await urlSeen(supabase, item.link)) continue

    const hay = `${item.title} ${(item.description ?? '')}`.toLowerCase()
    const match = pols.find(p => (p.name as string).toLowerCase() && hay.includes((p.name as string).toLowerCase()))
    if (!match) continue

    const tier = getSourceTier(new URL(item.link).hostname.replace(/^www\./i, ''))
    if (tier === null) continue

    const d = new Date(item.pubDate)
    const pub = Number.isNaN(d.getTime()) ? null : d.toISOString()

    const { error: insErr } = await supabase.from('verification_queue').insert({
      politician_id: match.id,
      article_url: item.link,
      article_title: item.title,
      outlet: chosen.outlet,
      tier: tier ?? undefined,
      record_type: 'statement',
      topic: null,
      extracted_quote: null,
      confidence: 55,
      pub_date: pub,
    })
    if (!insErr) queued++
  }

  return {
    ok: true as const,
    ran: 'rss-watch-lite' as const,
    feed: { outlet: chosen.outlet, domain: chosen.domain, index: idx, total },
    processed,
    queued,
  }
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const envDenied = assertRssEnv()
  if (envDenied) return envDenied

  const sp = req.nextUrl.searchParams
  const mode = (sp.get('mode') || '').toLowerCase()
  const forceLite = mode === 'lite'
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.trim()

  try {
    const supabase = getServiceSupabase()

    if (!forceLite && hasAnthropic) {
      const batchSize = qInt(sp, 'batch', 2, 1, 8)
      const maxItemsPerFeed = qInt(sp, 'items', 12, 5, 40)
      const maxClassifyCalls = qInt(sp, 'classify', 12, 1, 40)
      const maxExcerptFetches = qInt(sp, 'excerpts', 3, 0, 12)

      const summary = await runFeedWatcher({
        batchSize,
        maxItemsPerFeed,
        maxClassifyCalls,
        maxExcerptFetches,
      })

      return NextResponse.json({
        ok: true,
        ran: 'rss-watch-full',
        summary: summary ?? null,
        skippedFull: !summary,
        caps: { batchSize, maxItemsPerFeed, maxClassifyCalls, maxExcerptFetches },
        at: new Date().toISOString(),
      })
    }

    const lite = await runLite(supabase)
    return NextResponse.json({
      ...lite,
      at: new Date().toISOString(),
      hint: forceLite
        ? undefined
        : 'ANTHROPIC_API_KEY not set — ran rss-watch-lite (one feed, substring name match). Add the key on Netlify for the same Haiku pipeline as the old GitHub Action.',
    })
  } catch (e) {
    console.error('[cron/rss]', e)
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        hint: 'Full watcher needs ANTHROPIC_API_KEY and time within the host limit (Netlify 60s). Try ?mode=lite or lower ?classify= / ?batch=.',
      },
      { status: 500 }
    )
  }
}
