/**
 * packages/verifier/src/score.ts
 * Tevad.ro — Credibility Score Engine
 *
 * Master score (weights sum to 1.0):
 *
 * score = (score_promises * 0.25) + (score_declaratii * 0.12)
 *       + (score_reactions * 0.15) + (score_sources * 0.28) + (score_consistency * 0.20)
 *
 * `score_promises` uses only type=promise; `score_declaratii` only type=statement.
 * Rows with opinion_exempt=true are excluded from those two subscores (non-falsifiable / no verdict on record).
 * For statements only, impact_level='low' is excluded from score_declaratii (AI materiality; promises never use this).
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function monthsAgo(from: Date, to: Date): number {
  const days = daysBetween(from, to)
  return days / 30.4375
}

// ---- Component: score_promises (25% of total) — promises only ----
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
    .or('impact_level.is.null,impact_level.eq.high,impact_level.eq.medium')
    .in('status', ['true', 'false', 'partial'])

  if (!records || records.length === 0) return 50

  const kept = records.filter(r => r.status === 'true').length
  const broken = records.filter(r => r.status === 'false').length
  const partial = records.filter(r => r.status === 'partial').length
  const total = kept + broken + partial

  if (total === 0) return 50
  return Math.round(((kept * 1.0) + (partial * 0.5)) / total * 100)
}

// ---- Component: score_reactions (15%) — trust-weighted ----
async function calcReactions(politicianId: string): Promise<number> {
  const { data: recRows } = await supabase
    .from('records')
    .select('id')
    .eq('politician_id', politicianId)

  const recordIds = (recRows ?? []).map((r: any) => String(r.id))
  if (recordIds.length === 0) return 50

  // Pull raw reactions so we can trust-weight by fingerprint.
  const { data: reactions } = await supabase
    .from('reactions')
    .select('record_id, type, fingerprint, created_at')
    .in('record_id', recordIds)

  if (!reactions || reactions.length === 0) return 50

  type ReactionRow = { record_id: string; type: 'like' | 'dislike'; fingerprint: string; created_at: string }
  const rr = reactions as unknown as ReactionRow[]
  const fingerprints = Array.from(new Set(rr.map(r => r.fingerprint).filter(Boolean)))
  const trustByFp = new Map<string, number>()

  if (fingerprints.length > 0) {
    const { data: trustRows } = await supabase
      .from('reaction_fingerprint_trust')
      .select('fingerprint, trust_score')
      .in('fingerprint', fingerprints)

    for (const t of (trustRows ?? []) as any[]) {
      const fp = String(t.fingerprint)
      const ts = Number(t.trust_score)
      trustByFp.set(fp, Number.isFinite(ts) ? clamp(ts, 0, 3) : 1)
    }
  }

  // For each record, compute trust-weighted sentiment.
  const byRecord = new Map<string, ReactionRow[]>()
  for (const r of rr) {
    if (!byRecord.has(r.record_id)) byRecord.set(r.record_id, [])
    byRecord.get(r.record_id)!.push(r)
  }

  const sentiments: number[] = []
  for (const [, list] of Array.from(byRecord.entries())) {
    let wLike = 0
    let wTotal = 0
    for (const r of list) {
      const w = trustByFp.get(r.fingerprint) ?? 1
      wTotal += w
      if (r.type === 'like') wLike += w
    }
    if (wTotal > 0) sentiments.push(wLike / wTotal)
  }

  if (sentiments.length === 0) return 50
  const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
  return Math.round(avg * 100)
}

// ---- Component: score_sources (28%) — freshness + ≥3 sources bonus ----
async function calcSources(politicianId: string): Promise<number> {
  const { data: records } = await supabase
    .from('records')
    .select('id')
    .eq('politician_id', politicianId)

  if (!records || records.length === 0) return 50

  const recordIds = records.map(r => r.id)

  const { data: sources } = await supabase
    .from('sources')
    .select('record_id, tier, outlet, published_at, last_checked_at, http_status')
    .in('record_id', recordIds)

  if (!sources || sources.length === 0) return 50

  type Row = {
    record_id: string
    tier: string
    outlet: string
    published_at: string | null
    last_checked_at: string | null
    http_status: number | null
  }
  const byRecord = new Map<string, Row[]>()
  for (const s of sources as Row[]) {
    if (!byRecord.has(s.record_id)) byRecord.set(s.record_id, [])
    byRecord.get(s.record_id)!.push(s)
  }

  const recordScores = records.map(r => {
    const rows = byRecord.get(r.id) ?? []
    if (rows.length === 0) return 0.3

    const now = new Date()
    const tiers = rows.map(x => x.tier)
    const hasTier0 = tiers.some(t => t === '0')
    const hasTier1 = tiers.some(t => t === '1')
    const hasTier2 = tiers.some(t => t === '2')

    const published = rows
      .map(x => (x.published_at ? new Date(String(x.published_at)) : null))
      .filter((d): d is Date => d != null && !Number.isNaN(d.getTime()))

    const agesMonths = published.map(d => monthsAgo(d, now))
    const allUnder18mo = agesMonths.length > 0 && agesMonths.every(m => m >= 0 && m < 18)
    const anyTier1Fresh12 = hasTier1 && agesMonths.some(m => m >= 0 && m < 12)
    const anyTier2Fresh12 = hasTier2 && agesMonths.some(m => m >= 0 && m < 12)

    // 1.0 requires Tier-1 + official context.
    // 0.8 for fresh Tier-1, 0.6 for fresh Tier-2, else 0.3.
    let quality = 0.3
    if (hasTier0 && hasTier1) quality = 1.0
    else if (anyTier1Fresh12) quality = 0.8
    else if (anyTier2Fresh12) quality = 0.6

    const distinctOutlets = new Set(rows.map(x => x.outlet).filter(Boolean)).size
    const multiSourceBonus = distinctOutlets >= 3 ? 0.15 : 0
    const freshnessBonus = allUnder18mo ? 0.1 : 0
    return clamp(quality + multiSourceBonus + freshnessBonus, 0, 1)
  })

  const avg = recordScores.reduce((a, b) => a + b, 0) / recordScores.length
  return Math.round(avg * 100)
}

// ---- Component: score_consistency (20%) — contradiction_pairs + time decay ----
async function calcConsistency(politicianId: string): Promise<number> {
  const [{ data: pol }, { data: pairs }] = await Promise.all([
    supabase.from('politicians').select('mandate_start, mandate_end').eq('id', politicianId).maybeSingle(),
    supabase
      .from('contradiction_pairs')
      .select('topic, record_b_date')
      .eq('politician_id', politicianId),
  ])

  const mandateStart = pol?.mandate_start ? new Date(String(pol.mandate_start)) : null
  const mandateEnd = pol?.mandate_end ? new Date(String(pol.mandate_end)) : null
  const now = new Date()

  // If no topics/pairs or too little data, stay neutral.
  const list = (pairs ?? []) as Array<{ topic: string; record_b_date: string | null }>
  if (!list || list.length === 0) return 50

  // Count contradictions by topic with weights:
  // - same mandate: double penalty
  // - older than 2 years: time-decayed penalty
  const byTopic = new Map<string, Array<{ date: Date | null; weight: number }>>()
  for (const p of list) {
    const topic = String(p.topic || '')
    if (!topic) continue
    const d = p.record_b_date ? new Date(String(p.record_b_date)) : null
    const inMandate =
      d &&
      mandateStart &&
      d.getTime() >= mandateStart.getTime() &&
      (mandateEnd ? d.getTime() <= mandateEnd.getTime() : true)
    const ageYears = d ? monthsAgo(d, now) / 12 : 999
    const decay = ageYears > 2 ? 0.5 : 1.0
    const w = (inMandate ? 2.0 : 1.0) * decay
    if (!byTopic.has(topic)) byTopic.set(topic, [])
    byTopic.get(topic)!.push({ date: d, weight: w })
  }

  const topics = Array.from(byTopic.keys())
  if (topics.length === 0) return 50

  // We treat any topic with at least one contradiction pair as "contradicted topic".
  const totalTopics = topics.length
  const contradictionWeightSum = topics.reduce((acc, t) => {
    const ws = byTopic.get(t) ?? []
    const maxW = ws.reduce((m, x) => Math.max(m, x.weight), 0)
    return acc + maxW
  }, 0)

  const ratio = 1 - contradictionWeightSum / Math.max(totalTopics, 1)
  return Math.round(clamp(ratio, 0, 1) * 100)
}

/** v1.3.0 gate: minimum 10 verified records before score leaves neutral 50. */
async function verifiedRecordCount(politicianId: string): Promise<number> {
  const { count, error } = await supabase
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('politician_id', politicianId)
    .in('status', ['true', 'false', 'partial'])
  if (error) throw new Error(error.message)
  return count ?? 0
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

  const verifiedCount = await verifiedRecordCount(politicianId)
  if (verifiedCount < 10) {
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
    promises * 0.25 +
    declaratii * 0.12 +
    reactions * 0.15 +
    sources * 0.28 +
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
