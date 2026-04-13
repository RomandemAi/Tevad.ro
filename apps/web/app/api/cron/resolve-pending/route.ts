import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

function assertCronSecret(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const unauthorized = assertCronSecret(req)
  if (unauthorized) return unauthorized

  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? '5'), 20
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get pending non-opinion-exempt records
    const { data: pending } = await supabase
      .from('records')
      .select('id, slug, text, politician_id, type')
      .eq('status', 'pending')
      .eq('opinion_exempt', false)
      .limit(limit)

    return NextResponse.json({
      ok: true,
      ran: 'resolve-pending',
      found: pending?.length ?? 0,
      at: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
