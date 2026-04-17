import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
/** Same ceiling as `/api/cron/verify`, `rss-watch`, etc. (Next.js / Netlify). */
export const maxDuration = 60

/** Parallel outbound checks so external crons (e.g. 30s client timeout) can complete. */
const HEAD_CONCURRENCY = 12
const HEAD_TIMEOUT_MS = 4_500
/** Default batch size tuned for ~30s total wall time with parallel HEADs. */
const DEFAULT_LIMIT = 12

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase(): ReturnType<typeof createClient> | null {
  const url = getServiceSupabaseUrl().trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) return null
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
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
    })
    return res.status
  } catch {
    return null
  }
}

async function checkRowsInParallel(
  rows: any[]
): Promise<Array<{ id: string; host: string; status: number | null }>> {
  const out: Array<{ id: string; host: string; status: number | null }> = []
  for (let i = 0; i < rows.length; i += HEAD_CONCURRENCY) {
    const chunk = rows.slice(i, i + HEAD_CONCURRENCY)
    const part = await Promise.all(
      chunk.map(async r => {
        const id = String(r.id)
        const url = String(r.url || '')
        const host = safeHost(url)
        const status = url ? await headStatus(url) : null
        return { id, host, status }
      })
    )
    out.push(...part)
  }
  return out
}

const MIGRATION_028_HINT =
  'If the error mentions a missing column (last_checked_at, http_status), run migration `028_sources_health_signals.sql` on your Supabase project (SQL editor or supabase db push).'

export async function GET(req: NextRequest) {
  try {
    const denied = assertCronSecret(req)
    if (denied) return denied

    const limit = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT)))

    const supabase = getServiceSupabase()
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      )
    }

    // Pick sources that were never checked or were checked a while ago.
    const { data: rows, error } = await supabase
      .from('sources')
      .select('id, url, last_checked_at')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (error) {
      const msg = error.message
      const missingCol =
        /last_checked_at|http_status|content_hash/i.test(msg) ||
        (error as { code?: string }).code === '42703'
      return NextResponse.json(
        {
          ok: false,
          error: msg,
          hint: missingCol ? MIGRATION_028_HINT : undefined,
        },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    const rowList = (rows ?? []) as any[]

    const results = await checkRowsInParallel(rowList)

    let updated = 0
    for (const { id, status } of results) {
      const { error: uErr } = await supabase
        .from('sources')
        .update({
          last_checked_at: now,
          http_status: status,
        } as never)
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message, hint: MIGRATION_028_HINT }, { status: 500 })
  }
}

