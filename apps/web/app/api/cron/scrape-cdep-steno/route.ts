import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertCronSecret } from '@/lib/cron-auth'

/**
 * CDEP stenograme → `verification_queue` (Tier 0), chunked for Netlify cron.
 *
 * Netlify Scheduled Functions: hourly GET with header `Authorization: Bearer <CRON_SECRET>`.
 * Optional query tuning: `limitPoliticians`, `maxQueueInserts`, `maxTranscriptFetches`, `windowDays`, `leg`, `idl`.
 */

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

function assertSupabaseEnv(): NextResponse | null {
  const url = getServiceSupabaseUrl().trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const envDenied = assertSupabaseEnv()
  if (envDenied) return envDenied

  const q = req.nextUrl.searchParams
  const limitPoliticians = Math.min(20, Math.max(1, Number(q.get('limitPoliticians')) || 3))
  const maxQueueInserts = Math.min(40, Math.max(1, Number(q.get('maxQueueInserts')) || 8))
  const maxTranscriptFetches = Math.min(30, Math.max(1, Number(q.get('maxTranscriptFetches')) || 5))
  const windowDays = Math.min(120, Math.max(1, Number(q.get('windowDays')) || 14))
  const leg = q.get('leg')?.trim() || undefined
  const idl = q.get('idl')?.trim() || undefined

  const supabase = getServiceSupabase()

  try {
    const { runCdepStenoBatch } = await import('@tevad/scraper/cdep-steno')
    const result = await runCdepStenoBatch({
      supabase,
      limitPoliticians,
      maxQueueInserts,
      maxTranscriptFetches,
      windowDays,
      leg,
      idl,
    })
    return NextResponse.json({
      ok: result.ok,
      ran: 'cdep-steno',
      result,
      at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[cron/cdep-steno]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
