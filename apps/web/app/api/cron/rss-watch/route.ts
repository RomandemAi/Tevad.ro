import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'
import { TIER1_SOURCES, TIER2_SOURCES, getSourceTier } from '@tevad/rss-monitor/sources.config'

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

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const envDenied = assertRssEnv()
  if (envDenied) return envDenied

  try {
    const supabase = getServiceSupabase()
    const { chosen, idx, total } = await pickNextFeed(supabase)
    if (!chosen) return NextResponse.json({ ok: true, queued: 0, reason: 'no sources configured' })

    const res = await fetch(chosen.rssUrl, {
      headers: {
        'User-Agent': 'Tevad.org RSS Monitor (cron)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(8_000),
    })
    const xml = res.ok ? await res.text() : ''
    const items = xml ? parseRss(xml) : []

    // Load politicians once (heuristic match; fast, no LLM).
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

    return NextResponse.json({
      ok: true,
      ran: 'rss-watch-lite',
      feed: { outlet: chosen.outlet, domain: chosen.domain, index: idx, total },
      processed,
      queued,
      at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[cron/rss]', e)
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        hint: 'Check the terminal running `next dev` for the full stack trace. Often this is a bad Supabase URL/key or a network error fetching RSS feeds.',
      },
      { status: 500 }
    )
  }
}
