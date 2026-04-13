import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied
  try {
    const { run } = await import('@tevad/scraper/bec')
    const result = await run()
    return NextResponse.json({ ok: true, ran: 'bec', at: new Date().toISOString(), result })
  } catch (e) {
    console.error('[cron/bec]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
