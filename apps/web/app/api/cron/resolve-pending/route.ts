import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 503 })
  }

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(20, Math.max(1, Number(limitRaw) || 5))

  const { runResolvePending } = await import('@tevad/verifier/resolve-pending')
  const out = await runResolvePending({ limit })
  return NextResponse.json({ ok: true, ...out, at: new Date().toISOString() })
}
