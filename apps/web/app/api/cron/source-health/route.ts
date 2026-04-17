import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'

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

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

async function headStatus(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8_000) })
    return res.status
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const limit = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 25)))

  const supabase = getServiceSupabase()

  // Pick sources that were never checked or were checked a while ago.
  const { data: rows, error } = await supabase
    .from('sources')
    .select('id, url, last_checked_at')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const now = new Date().toISOString()
  const results: Array<{ id: string; host: string; status: number | null }> = []
  let updated = 0

  for (const r of (rows ?? []) as any[]) {
    const id = String(r.id)
    const url = String(r.url || '')
    const host = safeHost(url)
    const status = url ? await headStatus(url) : null
    results.push({ id, host, status })

    const { error: uErr } = await supabase
      .from('sources')
      .update({
        last_checked_at: now,
        http_status: status,
      })
      .eq('id', id)
    if (!uErr) updated++
  }

  return NextResponse.json({
    ok: true,
    ran: 'source-health',
    checked: (rows ?? []).length,
    updated,
    at: now,
    sample: results.slice(0, 10),
  })
}

