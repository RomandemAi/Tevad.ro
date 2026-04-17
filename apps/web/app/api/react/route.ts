import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function trustScoreHeuristic(params: { ageDays: number; distinctRecords: number; totalReactions: number }): number {
  const age = Math.max(0, params.ageDays)
  const dr = Math.max(0, params.distinctRecords)
  const tr = Math.max(0, params.totalReactions)
  const ageBoost = clamp(Math.log1p(age) / Math.log(60), 0, 1)
  const breadthBoost = clamp(Math.log1p(dr) / Math.log(25), 0, 1)
  const burstPenalty = dr > 0 ? clamp(tr / dr, 1, 30) : 30
  const burstFactor = clamp(1.25 - Math.log1p(burstPenalty) / Math.log(30), 0.3, 1.25)
  return clamp(0.8 + 0.7 * ageBoost + 0.7 * breadthBoost, 0.5, 2.2) * burstFactor
}

async function upsertFingerprintTrust(
  supabase: ReturnType<typeof getServiceSupabase>,
  fingerprint: string
) {
  const now = new Date().toISOString()

  const { data: agg } = await supabase
    .from('reactions')
    .select('record_id, created_at')
    .eq('fingerprint', fingerprint)

  const rows = (agg ?? []) as Array<{ record_id: string; created_at: string }>
  if (rows.length === 0) {
    await supabase.from('reaction_fingerprint_trust').upsert(
      {
        fingerprint,
        first_seen_at: now,
        last_seen_at: now,
        total_reactions: 0,
        distinct_records: 0,
        trust_score: 1.0,
        updated_at: now,
      } as any,
      { onConflict: 'fingerprint' }
    )
    return
  }

  const times = rows
    .map(r => new Date(r.created_at))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  const first = times[0] ?? new Date()
  const last = times[times.length - 1] ?? new Date()
  const ageDays = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
  const distinctRecords = new Set(rows.map(r => r.record_id)).size
  const totalReactions = rows.length
  const trust = clamp(trustScoreHeuristic({ ageDays, distinctRecords, totalReactions }), 0, 3)

  await supabase.from('reaction_fingerprint_trust').upsert(
    {
      fingerprint,
      first_seen_at: first.toISOString(),
      last_seen_at: last.toISOString(),
      total_reactions: totalReactions,
      distinct_records: distinctRecords,
      trust_score: trust,
      updated_at: now,
    } as any,
    { onConflict: 'fingerprint' }
  )
}

const DAILY_POLITICIAN_CAP = 250

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase()
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

  // Resolve politician for daily cap tracking.
  const { data: recRow } = await supabase
    .from('records')
    .select('politician_id')
    .eq('id', recordId)
    .maybeSingle()
  const politicianId = recRow?.politician_id ? String((recRow as any).politician_id) : null
  const today = new Date().toISOString().slice(0, 10)

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
      await upsertFingerprintTrust(supabase, fingerprint)
      return NextResponse.json({ action: 'removed' })
    } else {
      // Switch type
      await supabase.from('reactions').update({ type }).eq('id', existing.id)
      await upsertFingerprintTrust(supabase, fingerprint)
      return NextResponse.json({ action: 'switched', type })
    }
  }

  // Daily cap per politician (tank-proof anti-spike).
  if (politicianId) {
    const { data: capRow } = await supabase
      .from('politician_daily_reaction_caps')
      .select('reactions_total')
      .eq('politician_id', politicianId)
      .eq('day', today)
      .maybeSingle()
    const cur = Number((capRow as any)?.reactions_total ?? 0) || 0
    if (cur >= DAILY_POLITICIAN_CAP) {
      return NextResponse.json({ error: 'Daily reaction cap reached' }, { status: 429 })
    }
    await supabase
      .from('politician_daily_reaction_caps')
      .upsert(
        { politician_id: politicianId, day: today, reactions_total: cur + 1, updated_at: new Date().toISOString() } as any,
        { onConflict: 'politician_id,day' }
      )
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

  await upsertFingerprintTrust(supabase, fingerprint)
  return NextResponse.json({ action: 'added', type })
}
