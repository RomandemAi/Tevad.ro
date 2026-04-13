import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const envDenied = assertRssEnv()
  if (envDenied) return envDenied

  try {
    const { run } = await import('@tevad/rss-monitor/feed-watcher')
    await run()
    return NextResponse.json({ ok: true, ran: 'rss-watch', at: new Date().toISOString() })
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
