/**
 * packages/verifier/src/score.ts
 * Tevad.ro — Credibility Score Engine
 *
 * Master score (weights sum to 1.0):
 *
 * score = (score_promises * 0.28) + (score_declaratii * 0.12)
 *       + (score_reactions * 0.18) + (score_sources * 0.22) + (score_consistency * 0.20)
 *
 * `score_promises` uses only type=promise; `score_declaratii` only type=statement.
 * Rows with opinion_exempt=true are excluded from those two subscores (non-falsifiable / no verdict on record).
 *
 * Run: npx tsx packages/verifier/src/score.ts [politician-slug]
 * Cron: triggered after every new record or reaction batch
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { explainScoreChange } from './models'

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'apps/web/.env.local'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(process.cwd(), 'packages/verifier', '.env'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (process.env[k] === undefined) process.env[k] = v
    }
    console.log('[score] Loaded env from', p)
    return
  }
}

loadEnvFiles()

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

const supabase = createClient(
  getServiceSupabaseUrl(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ScoreComponents {
  promises: number
  declaratii: number
  reactions: number
  sources: number
  consistency: number
  total: number
}

// ---- Component: score_promises (28% of total) — promises only ----
async function calcPromises(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('status')
    .eq('politician_id', politicianId)
    .eq('type', 'promise')
    .eq('opinion_exempt', false)
    .in('status', ['true', 'false', 'partial'])

  if (!records || records.length === 0) return 50

  const kept    = records.filter(r => r.status === 'true').length
  const broken  = records.filter(r => r.status === 'false').length
  const partial = records.filter(r => r.status === 'partial').length
  const total   = kept + broken + partial

  if (total === 0) return 50
  return Math.round(((kept * 1.0) + (partial * 0.5)) / total * 100)
}

// ---- Component: score_declaratii (12% of total) — statements only ----
async function calcDeclaratii(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('status')
    .eq('politician_id', politicianId)
    .eq('type', 'statement')
    .eq('opinion_exempt', false)
    .in('status', ['true', 'false', 'partial'])

  if (!records || records.length === 0) return 50

  const kept = records.filter(r => r.status === 'true').length
  const broken = records.filter(r => r.status === 'false').length
  const partial = records.filter(r => r.status === 'partial').length
  const total = kept + broken + partial

  if (total === 0) return 50
  return Math.round(((kept * 1.0) + (partial * 0.5)) / total * 100)
}

// ---- Component: score_reactions (18%) ----
async function calcReactions(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('likes, dislikes')
    .eq('politician_id', politicianId)

  if (!records || records.length === 0) return 50

  const reactionSum = records.reduce(
    (acc, r) => acc + (r.likes ?? 0) + (r.dislikes ?? 0),
    0
  )
  if (reactionSum === 0) return 50

  const sentiments = records.map(r => {
    const total = (r.likes ?? 0) + (r.dislikes ?? 0)
    if (total === 0) return null
    return (r.likes ?? 0) / total
  })

  const withReactions = sentiments.filter((s): s is number => s !== null)
  if (withReactions.length === 0) return 50

  const avg = withReactions.reduce((a, b) => a + b, 0) / withReactions.length
  return Math.round(avg * 100)
}

// ---- Component: score_sources (22%) ----
async function calcSources(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('id')
    .eq('politician_id', politicianId)

  if (!records || records.length === 0) return 50

  const recordIds = records.map(r => r.id)

  const { data: sources } = await supabase
    .from('sources')
    .select('record_id, tier, outlet')
    .in('record_id', recordIds)

  if (!sources || sources.length === 0) return 50

  type Row = { record_id: string; tier: string; outlet: string }
  const byRecord = new Map<string, Row[]>()
  for (const s of sources as Row[]) {
    if (!byRecord.has(s.record_id)) byRecord.set(s.record_id, [])
    byRecord.get(s.record_id)!.push(s)
  }

  const recordScores = records.map(r => {
    const rows = byRecord.get(r.id) ?? []
    if (rows.length === 0) return 0.3

    const tiers = rows.map(x => x.tier)
    let quality = 0.3
    if (tiers.some(t => t === '0')) quality = 1.0
    else if (tiers.some(t => t === '1')) quality = 1.0
    else if (tiers.some(t => t === '2')) quality = 0.6

    const distinctOutlets = new Set(rows.map(x => x.outlet).filter(Boolean)).size
    const multiSourceBonus = distinctOutlets >= 2 ? 0.1 : 0
    return Math.min(quality + multiSourceBonus, 1.0)
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

  const byTopic = new Map<string, typeof records>()
  for (const r of records) {
    if (!r.topic) continue
    if (!byTopic.has(r.topic)) byTopic.set(r.topic, [])
    byTopic.get(r.topic)!.push(r)
  }

  let contradictions = 0
  let totalTopics = 0

  Array.from(byTopic.values()).forEach(topicRecords => {
    if (topicRecords.length < 2) return
    totalTopics++

    for (let i = 1; i < topicRecords.length; i++) {
      const prev = topicRecords[i - 1]
      const curr = topicRecords[i]
      if (
        (prev.status === 'true' && curr.status === 'false') ||
        (prev.status === 'false' && curr.status === 'true')
      ) {
        contradictions++
        break
      }
    }
  })

  if (totalTopics === 0) return 50
  const ratio = 1 - (contradictions / totalTopics)
  return Math.round(Math.max(ratio, 0) * 100)
}

/** No verified verdicts yet — keep neutral baseline (SCORING.md “no signal”). Pending-only rows used to distort sources (e.g. ~30%). */
async function hasVerifiedRecord(politicianId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('records')
    .select('id')
    .eq('politician_id', politicianId)
    .in('status', ['true', 'false', 'partial'])
    .limit(1)
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

// ---- Master score calculator ----
export async function recalcScore(politicianId: string): Promise<ScoreComponents> {
  const neutral: ScoreComponents = {
    promises: 50,
    declaratii: 50,
    reactions: 50,
    sources: 50,
    consistency: 50,
    total: 50,
  }

  if (!(await hasVerifiedRecord(politicianId))) {
    return neutral
  }

  const [promises, declaratii, reactions, sources, consistency] = await Promise.all([
    calcPromises(politicianId),
    calcDeclaratii(politicianId),
    calcReactions(politicianId),
    calcSources(politicianId),
    calcConsistency(politicianId),
  ])

  const total = Math.round(
    promises * 0.28 +
    declaratii * 0.12 +
    reactions * 0.18 +
    sources * 0.22 +
    consistency * 0.2
  )

  return { promises, declaratii, reactions, sources, consistency, total }
}

export interface SaveScoreOptions {
  /** If true, store `reason` verbatim in score_history (no Haiku paraphrase). */
  skipReasonExplain?: boolean
}

export async function saveScore(
  politicianId: string,
  components: ScoreComponents,
  reason: string,
  recordId?: string,
  options?: SaveScoreOptions
): Promise<void> {
  const { data: pol } = await supabase
    .from('politicians')
    .select('score, name')
    .eq('id', politicianId)
    .single()

  const prevScore = pol?.score ?? 50

  const { error: updateErr } = await supabase
    .from('politicians')
    .update({
      score:              components.total,
      score_promises:     components.promises,
      score_declaratii:   components.declaratii,
      score_reactions:    components.reactions,
      score_sources:      components.sources,
      score_consistency:  components.consistency,
    })
    .eq('id', politicianId)

  if (updateErr) throw updateErr

  let reasonForHistory = reason
  if (!options?.skipReasonExplain) {
    let recordText: string | undefined
    if (recordId) {
      const { data: rec } = await supabase.from('records').select('text').eq('id', recordId).single()
      recordText = rec?.text ?? undefined
    }
    try {
      reasonForHistory = await explainScoreChange(
        (pol as { name?: string })?.name ?? politicianId,
        prevScore,
        components.total,
        reason,
        recordText
      )
    } catch (e) {
      console.warn('[score] explainScoreChange failed:', (e as Error).message)
    }
  }

  await supabase.from('score_history').insert({
    politician_id:         politicianId,
    score_prev:            prevScore,
    score_new:             components.total,
    score_promises_new:    components.promises,
    score_declaratii_new: components.declaratii,
    score_reactions_new:   components.reactions,
    score_sources_new:     components.sources,
    score_consistency_new: components.consistency,
    reason:                reasonForHistory,
    record_id:             recordId ?? null,
  })

  console.log(
    `[score] ${politicianId}: ${prevScore} → ${components.total} ` +
    `(P:${components.promises} D:${components.declaratii} R:${components.reactions} S:${components.sources} C:${components.consistency})`
  )
}

export async function run(): Promise<void> {
  await recalcAll()
}

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
  run().catch(e => {
    console.error('[score] Fatal:', e)
    process.exit(1)
  })
}
