/**
 * Weekly contradiction sweep: LLM check per topic (2+ records), then score recalc.
 * Run: npx tsx packages/verifier/src/contradict.ts
 * Cron: /api/cron/contradict
 */

import { createClient } from '@supabase/supabase-js'
import { detectContradiction } from './models'
import { recalcScore, saveScore } from './score'

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const supabase = createClient(
  getServiceSupabaseUrl(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RecordRow = {
  id: string
  text: string
  date_made: string
  status: string
  topic: string | null
}

export async function run(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[contradict] ANTHROPIC_API_KEY missing — skipping.')
    return
  }

  const { data: politicians, error: polErr } = await supabase
    .from('politicians')
    .select('id')
    .eq('is_active', true)

  if (polErr) throw polErr
  if (!politicians?.length) {
    console.log('[contradict] No active politicians.')
    return
  }

  for (const { id: politicianId } of politicians) {
    const { data: records, error: recErr } = await supabase
      .from('records')
      .select('id, text, date_made, status, topic')
      .eq('politician_id', politicianId)
      .not('status', 'eq', 'pending')

    if (recErr) {
      console.error(`[contradict] records ${politicianId}:`, recErr.message)
      continue
    }

    const list = (records ?? []) as RecordRow[]
    const byTopic = new Map<string, RecordRow[]>()
    for (const r of list) {
      if (!r.topic) continue
      if (!byTopic.has(r.topic)) byTopic.set(r.topic, [])
      byTopic.get(r.topic)!.push(r)
    }

    let anyContradiction = false
    const topicBuckets = Array.from(byTopic.entries())
    for (let ti = 0; ti < topicBuckets.length; ti++) {
      const rows = topicBuckets[ti][1]
      if (rows.length < 2) continue
      const payload = rows.map(r => ({
        text: r.text,
        date: String(r.date_made),
        status: r.status,
        topic: r.topic!,
      }))
      try {
        const out = await detectContradiction(payload)
        if (out.hasContradiction) {
          anyContradiction = true
          console.log(
            `[contradict] ${politicianId} topic "${rows[0].topic}": ${out.explanation ?? 'detected'}`
          )
        }
      } catch (e) {
        console.warn(`[contradict] API ${politicianId}:`, (e as Error).message)
      }
    }

    if (anyContradiction) {
      try {
        const components = await recalcScore(politicianId)
        await saveScore(politicianId, components, 'contradiction_detected', undefined, {
          skipReasonExplain: true,
        })
        console.log(`[contradict] Recalculated ${politicianId} → ${components.total}`)
      } catch (e) {
        console.error(`[contradict] save ${politicianId}:`, e)
      }
    }
  }

  console.log('[contradict] Done.')
}

if (require.main === module) {
  run().catch(e => {
    console.error('[contradict] Fatal:', e)
    process.exit(1)
  })
}
