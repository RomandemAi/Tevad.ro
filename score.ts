/**
 * packages/verifier/src/score.ts
 * Tevad.ro — Credibility Score Engine
 *
 * Implements the public formula from SCORING.md v1.0.0:
 *
 * score = (score_promises * 0.35) + (score_reactions * 0.20)
 *       + (score_sources * 0.25) + (score_consistency * 0.20)
 *
 * Run: npx tsx packages/verifier/src/score.ts [politician-slug]
 * Cron: triggered after every new record or reaction batch
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ScoreComponents {
  promises: number
  reactions: number
  sources: number
  consistency: number
  total: number
}

// ---- Component: score_promises (35%) ----
async function calcPromises(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('status')
    .eq('politician_id', politicianId)
    .in('status', ['true', 'false', 'partial'])

  if (!records || records.length === 0) return 50 // neutral default

  const kept    = records.filter(r => r.status === 'true').length
  const broken  = records.filter(r => r.status === 'false').length
  const partial = records.filter(r => r.status === 'partial').length
  const total   = kept + broken + partial

  if (total === 0) return 50
  return Math.round(((kept * 1.0) + (partial * 0.5)) / total * 100)
}

// ---- Component: score_reactions (20%) ----
async function calcReactions(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('likes, dislikes')
    .eq('politician_id', politicianId)

  if (!records || records.length === 0) return 50

  const sentiments = records.map(r => {
    const total = (r.likes ?? 0) + (r.dislikes ?? 0)
    if (total === 0) return 0.5 // neutral if no reactions
    return (r.likes ?? 0) / total
  })

  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
  return Math.round(avg * 100)
}

// ---- Component: score_sources (25%) ----
async function calcSources(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('id')
    .eq('politician_id', politicianId)

  if (!records || records.length === 0) return 50

  const recordIds = records.map(r => r.id)

  const { data: sources } = await supabase
    .from('sources')
    .select('record_id, tier')
    .in('record_id', recordIds)

  if (!sources || sources.length === 0) return 30

  // Group sources by record
  const byRecord = new Map<string, string[]>()
  for (const s of sources) {
    if (!byRecord.has(s.record_id)) byRecord.set(s.record_id, [])
    byRecord.get(s.record_id)!.push(s.tier)
  }

  const recordScores = records.map(r => {
    const tiers = byRecord.get(r.id) ?? []
    if (tiers.length === 0) return 0.3 // no sources

    let quality = 0.3
    if (tiers.some(t => t === '0')) quality = 1.0      // official record
    else if (tiers.some(t => t === '1')) quality = 1.0  // tier-1 source
    else if (tiers.some(t => t === '2')) quality = 0.6  // tier-2 only

    // Multi-source bonus
    const uniqueOutlets = new Set(tiers).size
    if (uniqueOutlets >= 2) quality = Math.min(quality + 0.1, 1.0)

    return quality
  })

  const avg = recordScores.reduce((a, b) => a + b, 0) / recordScores.length
  return Math.round(avg * 100)
}

// ---- Component: score_consistency (20%) ----
async function calcConsistency(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('id, topic, status, date_made')
    .eq('politician_id', politicianId)
    .not('status', 'eq', 'pending')
    .order('date_made', { ascending: true })

  if (!records || records.length < 3) return 50

  // Group by topic
  const byTopic = new Map<string, typeof records>()
  for (const r of records) {
    if (!r.topic) continue
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, [])
    byTopic.get(r.topic)!.push(r)
  }

  let contradictions = 0
  let totalTopics = 0

  for (const [, topicRecords] of byTopic) {
    if (topicRecords.length < 2) continue
    totalTopics++

    // Check if later records contradict earlier ones
    for (let i = 1; i < topicRecords.length; i++) {
      const prev = topicRecords[i - 1]
      const curr = topicRecords[i]
      if (
        (prev.status === 'true' && curr.status === 'false') ||
        (prev.status === 'false' && curr.status === 'true')
      ) {
        contradictions++
        break // Count one contradiction per topic
      }
    }
  }

  if (totalTopics === 0) return 50
  const ratio = 1 - (contradictions / totalTopics)
  return Math.round(Math.max(ratio, 0) * 100)
}

// ---- Master score calculator ----
export async function recalcScore(politicianId: string): Promise<ScoreComponents> {
  const [promises, reactions, sources, consistency] = await Promise.all([
    calcPromises(politicianId),
    calcReactions(politicianId),
    calcSources(politicianId),
    calcConsistency(politicianId),
  ])

  const total = Math.round(
    (promises    * 0.35) +
    (reactions   * 0.20) +
    (sources     * 0.25) +
    (consistency * 0.20)
  )

  return { promises, reactions, sources, consistency, total }
}

export async function saveScore(
  politicianId: string,
  components: ScoreComponents,
  reason: string,
  recordId?: string
): Promise<void> {
  // Get current score for history
  const { data: pol } = await supabase
    .from('politicians')
    .select('score')
    .eq('id', politicianId)
    .single()

  const prevScore = pol?.score ?? 50

  // Update politician scores
  const { error: updateErr } = await supabase
    .from('politicians')
    .update({
      score:              components.total,
      score_promises:     components.promises,
      score_reactions:    components.reactions,
      score_sources:      components.sources,
      score_consistency:  components.consistency,
    })
    .eq('id', politicianId)

  if (updateErr) throw updateErr

  // Log to score history
  await supabase.from('score_history').insert({
    politician_id:         politicianId,
    score_prev:            prevScore,
    score_new:             components.total,
    score_promises_new:    components.promises,
    score_reactions_new:   components.reactions,
    score_sources_new:     components.sources,
    score_consistency_new: components.consistency,
    reason,
    record_id: recordId ?? null,
  })

  console.log(
    `[score] ${politicianId}: ${prevScore} → ${components.total} ` +
    `(P:${components.promises} R:${components.reactions} S:${components.sources} C:${components.consistency})`
  )
}

// Recalculate all politicians (full rebuild)
async function recalcAll() {
  const { data: politicians } = await supabase
    .from('politicians')
    .select('id, name')
    .eq('is_active', true)

  if (!politicians) return

  console.log(`[score] Recalculating ${politicians.length} politicians...`)

  for (const pol of politicians) {
    try {
      const components = await recalcScore(pol.id)
      await saveScore(pol.id, components, 'full_recalc')
      console.log(`[score] ✓ ${pol.name} → ${components.total}`)
    } catch (e) {
      console.error(`[score] Failed for ${pol.name}:`, e)
    }
  }

  console.log('[score] All scores updated.')
}

if (require.main === module) {
  recalcAll().catch(e => {
    console.error('[score] Fatal:', e)
    process.exit(1)
  })
}
