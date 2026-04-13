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
import { getVerificationSystemPrompt, runVerificationModel } from './model-runner'
import type { BlindPayload } from './blind-types'

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
}

function verdictsAgree(a: Verdict, b: Verdict): boolean {
  if (a === b) return true
  if ((a === 'partial' || a === 'pending') && (b === 'partial' || b === 'pending')) return true
  return false
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

const PRIMARY_MODEL = 'claude-sonnet-4-6'
const SECONDARY_MODEL = 'claude-haiku-4-5-20251001'

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

  console.log(`[cross-check] Running dual-model verification (blind)...`)
  console.log(`[cross-check] Primary: ${PRIMARY_MODEL}, Secondary: ${SECONDARY_MODEL}`)

  const [primaryOut, secondaryOut] = await Promise.all([
    runVerificationModel(PRIMARY_MODEL, userPrompt, systemPrompt),
    runVerificationModel(SECONDARY_MODEL, userPrompt, systemPrompt),
  ])

  const primary = primaryOut?.parsed ?? null
  const secondary = secondaryOut?.parsed ?? null
  const responsePrimaryRaw = primaryOut?.rawText ?? null
  const responseSecondaryRaw = secondaryOut?.rawText ?? null

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
    }
  }

  let flaggedForReview = false

  if (!diversityCheck.passes && primary.verdict === 'false') {
    console.warn(`[cross-check] Source diversity check failed: ${diversityCheck.reason}`)
    console.warn('[cross-check] Forcing PENDING due to source diversity requirement')
    flaggedForReview = true
    return {
      finalVerdict: 'pending',
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: secondary ? SECONDARY_MODEL : null,
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: secondary ? verdictsAgree(primary.verdict, secondary.verdict) : null,
      forcedPending: true,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview,
    }
  }

  if (!secondary) {
    console.warn('[cross-check] Secondary model failed — using primary verdict only')
    return {
      finalVerdict: primary.verdict,
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: null,
      secondaryVerdict: null,
      secondaryConfidence: null,
      modelsAgreed: null,
      forcedPending: false,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview: false,
    }
  }

  const agreed = verdictsAgree(primary.verdict, secondary.verdict)

  if (!agreed) {
    console.warn(
      `[cross-check] Models DISAGREE: Sonnet=${primary.verdict} Haiku=${secondary.verdict} → PENDING`
    )
    return {
      finalVerdict: 'pending',
      primaryModel: PRIMARY_MODEL,
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: SECONDARY_MODEL,
      secondaryVerdict: secondary.verdict,
      secondaryConfidence: secondary.confidence,
      modelsAgreed: false,
      forcedPending: true,
      blindVerified: true,
      responsePrimaryRaw,
      responseSecondaryRaw,
      blindPayload,
      flaggedForReview: true,
    }
  }

  console.log(
    `[cross-check] Models AGREE: ${primary.verdict} (Sonnet ${primary.confidence}%, Haiku ${secondary.confidence}%)`
  )
  console.log(`[cross-check] → Politician: ${input.politicianName} (ID: ${input.politicianId})`)

  return {
    finalVerdict: primary.verdict,
    primaryModel: PRIMARY_MODEL,
    primaryVerdict: primary.verdict,
    primaryConfidence: primary.confidence,
    primaryReasoning: primary.reasoning,
    secondaryModel: SECONDARY_MODEL,
    secondaryVerdict: secondary.verdict,
    secondaryConfidence: secondary.confidence,
    modelsAgreed: true,
    forcedPending: false,
    blindVerified: true,
    responsePrimaryRaw,
    responseSecondaryRaw,
    blindPayload,
    flaggedForReview: false,
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

  const { error } = await supabase
    .from('records')
    .update({
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
    })
    .eq('id', recordId)

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

    prompt_version: 'v1.0.0',
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
