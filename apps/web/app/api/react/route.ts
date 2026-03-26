import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { recordId, type } = await req.json()

  if (!recordId || !['like', 'dislike'].includes(type)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Generate anonymous fingerprint from IP + User-Agent
  // Not PII — it's a one-way hash
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown'
  const ua = headersList.get('user-agent') ?? 'unknown'
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}:${ua}:${recordId}`)
    .digest('hex')
    .slice(0, 32)

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, type')
    .eq('record_id', recordId)
    .eq('fingerprint', fingerprint)
    .single()

  if (existing) {
    if (existing.type === type) {
      // Toggle off
      await supabase.from('reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    } else {
      // Switch type
      await supabase.from('reactions').update({ type }).eq('id', existing.id)
      return NextResponse.json({ action: 'switched', type })
    }
  }

  // New reaction
  const { error } = await supabase.from('reactions').insert({
    record_id: recordId,
    type,
    fingerprint,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ action: 'added', type })
}
