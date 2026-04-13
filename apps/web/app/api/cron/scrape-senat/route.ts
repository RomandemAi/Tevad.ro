import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied
  try {
    // Lightweight health/check endpoint for Netlify (free-tier timeouts).
    // Heavy scraping should run in GitHub Actions.
    const url = 'https://www.senat.ro/FisaSenatori.aspx'
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Tevad.ro cron (light)' },
      signal: AbortSignal.timeout(8_000),
    })
    const html = res.ok ? await res.text() : ''
    const count = (html.match(/FisaSenator\.aspx\?ParlamentarID=/gi) ?? []).length

    const supabase = getServiceSupabase()
    const { data: prev } = await supabase.from('cron_state').select('value').eq('key', 'senat_count').maybeSingle()
    const prevCount = Number(prev?.value ?? 0) || 0
    const changed = prevCount !== count
    await supabase
      .from('cron_state')
      .upsert({ key: 'senat_count', value: String(count), updated_at: new Date().toISOString() })

    return NextResponse.json({
      ok: true,
      ran: 'senat-lite',
      url,
      status: res.status,
      senators_link_count: count,
      prev_count: prevCount,
      changed,
      note: 'Heavy senat scraper runs in GitHub Actions; this endpoint is a lightweight change detector.',
      at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[cron/senat]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
