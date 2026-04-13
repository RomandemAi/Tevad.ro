import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied
  try {
    const { run } = await import('@tevad/verifier/contradict')
    await run()
    return NextResponse.json({ ok: true, ran: 'contradict', at: new Date().toISOString() })
  } catch (e) {
    console.error('[cron/contradict]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
