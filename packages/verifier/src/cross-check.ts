/**
 * packages/verifier/src/cross-check.ts
 * Tevad.ro — Multi-model cross-check (#4)
 *
 * System prompt is always loaded from prompts/neutrality-system-prompt.md (see neutrality-prompt.ts).
 */

import { createClient } from '@supabase/supabase-js'
import { passesSourceDiversityCheck } from '../../rss-monitor/src/sources.config'
import type { SourceLean } from '../../rss-monitor/src/sources.config'
import { buildBlindPayload } from './blind-payload'
import { buildBlindUserPrompt } from './prompt-utils'
import { getVerificationSystemPrompt, GROK_MODEL, runGrokModel, runVerificationModel } from './model-runner'
import type { BlindPayload, ModelResult } from './blind-types'

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase() {
  const url = getServiceSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key)
}

type Verdict = 'true' | 'false' | 'partial' | 'pending'
type ImpactLevel = 'high' | 'medium' | 'low'

export interface CrossCheckResult {
  finalVerdict: Verdict
  primaryModel: string
  primaryVerdict: Verdict
  primaryConfidence: number
  primaryReasoning: string
  secondaryModel: string | null
  secondaryVerdict: Verdict | null
  secondaryConfidence: number | null
  modelsAgreed: boolean | null
  forcedPending: boolean
  blindVerified: true
  /** Raw model output for audit trail */
  responsePrimaryRaw: string | null
  responseSecondaryRaw: string | null
  blindPayload: BlindPayload
  flaggedForReview: boolean
  /** Set only when verifying type=statement; used to persist `records.impact_level`. */
  statementImpactLevel: ImpactLevel | null
}

export interface CrossCheckInput {
  politicianName: string
  politicianId: string
  statementText: string
  statementDate: string
  statementType: 'promise' | 'statement' | 'vote'
  sources: Array<{
    outlet: string
    url: string
    tier: number
    lean?: SourceLean
    title?: string
    excerpt?: string
    publishedAt?: string
  }>
}

/** AI materiality for declarații only; null for promise/vote (we do not overwrite impact_level). */
export function resolveStatementImpactLevel(
  statementType: CrossCheckInput['statementType'],
  primary: ModelResult | null
): ImpactLevel | null {
  if (statementType !== 'statement') return null
  const v = primary?.impact_level
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

const PRIMARY_MODEL = 'claude-sonnet-4-6'
const SECONDARY_MODEL = 'claude-haiku-4-5-20251001'
const PROMPT_VERSION = 'v1.3.0'

const INTEGRITY_PENDING = {
  verdict: 'pending' as const,
  confidence: 0,
  reasoning: 'Prompt integrity violation detected',
  canBeDecided: false,
  requiresMoreSources: true,
} as const

function isVerdict(x: unknown): x is Verdict {
  return x === 'true' || x === 'false' || x === 'partial' || x === 'pending'
}

function isImpact(x: unknown): x is ImpactLevel {
  return x === 'high' || x === 'medium' || x === 'low'
}

function looksLikeJailbreak(raw: string): boolean {
  const t = raw.toLowerCase()
  if (!t) return true
  // Not exhaustive; just obvious prompt-injection patterns.
  return (
    t.includes('ignore previous') ||
    t.includes('system prompt') ||
    t.includes('developer message') ||
    t.includes('you are chatgpt') ||
    t.includes('begin') && t.includes('instructions')
  )
}

function validateStrictModelResult(
  statementType: CrossCheckInput['statementType'],
  parsed: unknown,
  rawText: string
): ModelResult | null {
  if (typeof rawText !== 'string' || rawText.trim().length < 2) return null
  if (looksLikeJailbreak(rawText)) return null
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  const allowedBase = new Set(['verdict', 'confidence', 'reasoning', 'canBeDecided', 'requiresMoreSources'])
  const allowedStatement = new Set(['verdict', 'confidence', 'reasoning', 'canBeDecided', 'requiresMoreSources', 'impact_level'])
  const allowed = statementType === 'statement' ? allowedStatement : allowedBase

  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) return null
  }

  if (!isVerdict(obj.verdict)) return null
  if (typeof obj.confidence !== 'number' || !Number.isFinite(obj.confidence)) return null
  if (obj.confidence < 0 || obj.confidence > 100) return null
  if (typeof obj.reasoning !== 'string' || obj.reasoning.trim().length < 1) return null
  if (typeof obj.canBeDecided !== 'boolean') return null
  if (typeof obj.requiresMoreSources !== 'boolean') return null

  if (statementType === 'statement') {
    if (!isImpact(obj.impact_level)) return null
  } else {
    if ('impact_level' in obj) return null
  }

  return obj as unknown as ModelResult
}

function chooseMajority(models: Array<{ model: string; parsed: ModelResult | null; rawText: string }>): {
  final: ModelResult | null
  agreed: boolean | null
} {
  const valid = models.filter(m => m.parsed != null) as Array<{
    model: string
    parsed: ModelResult
    rawText: string
  }>
  if (valid.length < 2) return { final: valid[0]?.parsed ?? null, agreed: null }

  const byVerdict = new Map<Verdict, Array<typeof valid[number]>>()
  for (const v of valid) {
    const key = v.parsed.verdict
    if (!byVerdict.has(key)) byVerdict.set(key, [])
    byVerdict.get(key)!.push(v)
  }

  // 2/3 majority required when 3 models present; when 2 valid models, agreement is that both match.
  const buckets = Array.from(byVerdict.entries()).sort((a, b) => b[1].length - a[1].length)
  const top = buckets[0]
  if (!top) return { final: null, agreed: null }

  if (valid.length >= 3) {
    if (top[1].length >= 2) return { final: top[1][0]!.parsed, agreed: true }
    return { final: null, agreed: false }
  }

  // valid.length === 2
  if (top[1].length === 2) return { final: top[1][0]!.parsed, agreed: true }
  return { final: null, agreed: false }
}

export async function crossCheckVerify(input: CrossCheckInput): Promise<CrossCheckResult> {
  const diversityCheck = passesSourceDiversityCheck(
    input.sources.map(s => ({ tier: s.tier, lean: s.lean }))
  )

  const blindPayload = buildBlindPayload({
    statementText: input.statementText,
    statementDate: input.statementDate,
    statementType: input.statementType,
    sources: input.sources,
  })
  const userPrompt = buildBlindUserPrompt(blindPayload)
  const systemPrompt = getVerificationSystemPrompt()

  console.log(`[cross-check] Running verification (blind)...`)
  console.log(`[cross-check] Models: ${PRIMARY_MODEL}, ${SECONDARY_MODEL}, ${GROK_MODEL}`)

  const [primaryOut, secondaryOut, grokOut] = await Promise.all([
    runVerificationModel(PRIMARY_MODEL, userPrompt, systemPrompt),
    runVerificationModel(SECONDARY_MODEL, userPrompt, systemPrompt),
    runGrokModel(userPrompt, systemPrompt),
  ])

  const responsePrimaryRaw = primaryOut?.rawText ?? null
  const responseSecondaryRaw = secondaryOut?.rawText ?? null
  const responseGrokRaw = grokOut?.rawText ?? null

  const primary = validateStrictModelResult(input.statementType, primaryOut?.parsed, primaryOut?.rawText ?? '') ??
    null
  const secondary = validateStrictModelResult(input.statementType, secondaryOut?.parsed, secondaryOut?.rawText ?? '') ??
    null
  const grok = validateStrictModelResult(input.statementType, grokOut?.parsed, grokOut?.rawText ?? '') ?? null

  // If any model produces prompt-integrity-violation JSON, treat it as a strong signal to go pending.
  const integrityHit =
    (primary && primary.verdict === 'pending' && primary.reasoning === INTEGRITY_PENDING.reasoning) ||
    (secondary && secondary.verdict === 'pending' && secondary.reasoning === INTEGRITY_PENDING.reasoning) ||
    (grok && grok.verdict === 'pending' && grok.reasoning === INTEGRITY_PENDING.reasoning)
  if (integrityHit) {
    return {
      finalVerdict: 'pending',
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: 'pending',
      primaryConfidence: 0,
      primaryReasoning: INTEGRITY_PENDING.reasoning,
      secondaryModel: SECONDARY_MODEL,
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: null,
      forcedPending: true,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview: true,
      statementImpactLevel: resolveStatementImpactLevel(input.statementType, null),
    }
  }

  if (!primary) {
    console.error('[cross-check] Primary model failed — returning PENDING')
    return {
      finalVerdict: 'pending',
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: 'pending',
      primaryConfidence: 0,
      primaryReasoning: 'Primary model unavailable — manual review required',
      secondaryModel: SECONDARY_MODEL,
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: null,
      forcedPending: true,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview: true,
      statementImpactLevel: resolveStatementImpactLevel(input.statementType, null),
    }
  }

  let flaggedForReview = false

  const models = [
    { model: PRIMARY_MODEL, parsed: primary, rawText: responsePrimaryRaw ?? '' },
    { model: SECONDARY_MODEL, parsed: secondary, rawText: responseSecondaryRaw ?? '' },
    { model: GROK_MODEL, parsed: grok, rawText: responseGrokRaw ?? '' },
  ]

  const { final: majority, agreed } = chooseMajority(models)

  // Majority rule: if 2/3 (or 2/2) agree -> accept that verdict; else pending.
  const finalVerdict = majority?.verdict ?? 'pending'

  if (!diversityCheck.passes && finalVerdict === 'false') {
    console.warn(`[cross-check] Source diversity check failed: ${diversityCheck.reason}`)
    console.warn('[cross-check] Forcing PENDING due to source diversity requirement')
    flaggedForReview = true
    return {
      finalVerdict: 'pending',
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: SECONDARY_MODEL,
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: agreed,
      forcedPending: true,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview,
      statementImpactLevel: resolveStatementImpactLevel(input.statementType, primary),
    }
  }

  if (!majority) {
    console.warn('[cross-check] No majority verdict (or insufficient valid models) → PENDING')
    flaggedForReview = true
  }

  console.log(`[cross-check] Majority: ${finalVerdict} (agreed=${String(agreed)})`)
  console.log(`[cross-check] → Politician: ${input.politicianName} (ID: ${input.politicianId})`)

  return {
    finalVerdict,
    primaryModel: PRIMARY_MODEL,
    primaryVerdict: primary.verdict,
    primaryConfidence: primary.confidence,
    primaryReasoning: primary.reasoning,
    secondaryModel: secondary ? SECONDARY_MODEL : null,
    secondaryVerdict: secondary?.verdict ?? null,
    secondaryConfidence: secondary?.confidence ?? null,
    modelsAgreed: agreed,
    forcedPending: finalVerdict === 'pending',
    blindVerified: true,
    responsePrimaryRaw,
    responseSecondaryRaw,
    blindPayload,
    flaggedForReview,
    statementImpactLevel: resolveStatementImpactLevel(input.statementType, majority ?? primary),
  }
}

export async function saveCrossCheckResult(
  recordId: string,
  politicianId: string,
  result: CrossCheckResult,
  sourcesFed: CrossCheckInput['sources']
): Promise<void> {
  const supabase = getServiceSupabase()
  const diversityCheck = passesSourceDiversityCheck(
    sourcesFed.map(s => ({ tier: s.tier, lean: s.lean }))
  )

  const recordPatch: Record<string, unknown> = {
    status: result.finalVerdict,
    ai_verdict: result.finalVerdict,
    ai_confidence: result.primaryConfidence,
    ai_reasoning: result.primaryReasoning,
    ai_model: result.primaryModel,
    ai_can_be_decided: !result.forcedPending,
    ai_requires_more_sources: result.forcedPending,
    ai_models_agreed: result.modelsAgreed,
    ai_verified_at: new Date().toISOString(),
    date_verified: new Date().toISOString(),
  }
  if (result.statementImpactLevel != null) {
    recordPatch.impact_level = result.statementImpactLevel
  }

  const { error } = await supabase.from('records').update(recordPatch as Record<string, unknown>).eq('id', recordId)

  if (error) throw error

  const auditInsert = {
    record_id: recordId,
    politician_id: politicianId,

    model_primary: result.primaryModel,
    model_secondary: result.secondaryModel,

    final_verdict: result.finalVerdict,
    verdict_primary: result.primaryVerdict,
    verdict_secondary: result.secondaryVerdict,

    confidence: result.primaryConfidence,
    reasoning: result.primaryReasoning,

    models_agreed: result.modelsAgreed,
    flagged_for_review: result.flaggedForReview,
    blind_verified: result.blindVerified,

    prompt_version: PROMPT_VERSION,
    blind_payload: result.blindPayload,
    sources_fed: sourcesFed,
    response_primary: result.responsePrimaryRaw,
    response_secondary: result.responseSecondaryRaw,

    can_be_decided: !result.forcedPending,
    requires_more_sources: result.forcedPending,
    diversity_check_passed: diversityCheck.passes,
    diversity_check_reason: diversityCheck.reason ?? null,
    source_diversity_flag: !diversityCheck.passes,

    processing_time_ms: null as number | null,
  }

  const { error: insErr } = await supabase.from('verdict_audit_logs').insert(auditInsert as any)

  if (insErr) throw insErr

  console.log(`[cross-check] ✓ Saved: ${recordId} → ${result.finalVerdict}`)
}
