import { NextRequest, NextResponse } from 'next/server'
import { assertCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied
  try {
    const { run } = await import('@tevad/scraper/cdep')
    const result = await run()
    return NextResponse.json({ ok: true, ran: 'cdep', at: new Date().toISOString(), result })
  } catch (e) {
    console.error('[cron/cdep]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
