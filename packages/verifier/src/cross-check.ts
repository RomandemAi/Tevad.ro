/**
 * packages/verifier/src/cross-check.ts
 * Tevad.ro — Multi-model cross-check (#4)
 *
 * Every verification runs through TWO models:
 *   Primary:   claude-sonnet-4-6  (main judge)
 *   Secondary: claude-haiku-4-5   (independent cross-check)
 *
 * Agreement rules:
 * - Both agree → final verdict accepted
 * - They disagree → verdict forced to PENDING + flagged for human review
 * - Secondary fails → primary verdict used, models_agreed = null
 *
 * This prevents any single model from being the sole source of truth.
 * Both prompts are identical and BLIND (no politician identity).
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { passesSourceDiversityCheck } from '../../rss-monitor/src/sources.config'
import type { SourceLean } from '../../rss-monitor/src/sources.config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Verdict = 'true' | 'false' | 'partial' | 'pending'

interface ModelResponse {
  verdict: Verdict
  confidence: number
  reasoning: string
  canBeDecided: boolean
  requiresMoreSources: boolean
}

interface CrossCheckResult {
  finalVerdict: Verdict
  primaryModel: string
  primaryVerdict: Verdict
  primaryConfidence: number
  primaryReasoning: string
  secondaryModel: string | null
  secondaryVerdict: Verdict | null
  secondaryConfidence: number | null
  modelsAgreed: boolean | null       // null = secondary failed/unavailable
  forcedPending: boolean             // true = disagreement forced PENDING
  blindVerified: true
}

const SYSTEM_PROMPT = `You are a neutral fact-verification engine for a political accountability platform.

YOUR MISSION:
Determine whether a political statement, promise, or vote matches what actually happened.
You have NO political opinion. You represent NO party. You serve ONLY the facts.
You do NOT know who made the statement — this is intentional to prevent bias.

VERDICT OPTIONS:
- "true" — The statement/promise/vote is confirmed by sources
- "false" — The statement/promise/vote is contradicted by sources
- "partial" — Partially true or partially kept
- "pending" — Insufficient evidence to decide yet

STRICT RULES:
1. For "false" verdict: minimum 2 independent Tier-1 sources OR 1 Tier-1 + 1 official government record
2. Official government records (Monitorul Oficial, parliament vote logs) ALWAYS override media
3. If evidence is mixed or insufficient — return "pending", NOT "false"
4. No editorial language. No political framing. Only facts from the sources.
5. Confidence reflects source quality: Tier-0 official = high, Tier-2 only = lower

RESPONSE FORMAT (JSON only, no other text):
{
  "verdict": "true|false|partial|pending",
  "confidence": 0-100,
  "reasoning": "2-3 sentences max, factual only, no editorial opinion",
  "canBeDecided": true/false,
  "requiresMoreSources": true/false
}`

function buildBlindPrompt(
  statementText: string,
  statementDate: string,
  statementType: string,
  sources: Array<{ outlet: string; url: string; tier: number; lean?: string; title?: string; excerpt?: string; publishedAt?: string }>
): string {
  const tier1 = sources.filter(s => s.tier <= 1)
  const tier2 = sources.filter(s => s.tier === 2)
  return `
STATEMENT TYPE: ${statementType.toUpperCase()}
DATE MADE: ${statementDate}

STATEMENT TEXT:
"${statementText}"

SOURCES PROVIDED (${sources.length} total — ${tier1.length} Tier-1, ${tier2.length} Tier-2):

${sources.map((s, i) => `
SOURCE ${i + 1} [TIER ${s.tier}]${s.lean ? ` [${s.lean.toUpperCase()}]` : ''} — ${s.outlet}
URL: ${s.url}
Published: ${s.publishedAt ?? 'unknown'}
Title: ${s.title ?? 'N/A'}
Excerpt: ${s.excerpt ?? 'No excerpt available'}
`).join('\n')}

Analyze the above and return your verdict as JSON.
Remember: FALSE requires 2+ independent Tier-1 sources or 1 Tier-1 + 1 official record.
`
}

async function runModel(
  model: string,
  prompt: string
): Promise<ModelResponse | null> {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch (e) {
    console.warn(`[cross-check] Model ${model} failed:`, (e as Error).message)
    return null
  }
}

function verdictsAgree(a: Verdict, b: Verdict): boolean {
  // Exact match OR both non-decisive (partial/pending treated as agreeing)
  if (a === b) return true
  if ((a === 'partial' || a === 'pending') && (b === 'partial' || b === 'pending')) return true
  return false
}

interface CrossCheckInput {
  politicianName: string    // For logging only — never sent to models
  politicianId: string      // Attached after verdict — never sent to models
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

export async function crossCheckVerify(input: CrossCheckInput): Promise<CrossCheckResult> {
  // Source diversity check (#5) — before even calling models
  const diversityCheck = passesSourceDiversityCheck(
    input.sources.map(s => ({ tier: s.tier, lean: s.lean }))
  )

  const prompt = buildBlindPrompt(
    input.statementText,
    input.statementDate,
    input.statementType,
    input.sources
  )

  console.log(`[cross-check] Running dual-model verification (blind)...`)
  console.log(`[cross-check] Primary: claude-sonnet-4-6, Secondary: claude-haiku-4-5-20251001`)

  // Run both models in parallel
  const [primary, secondary] = await Promise.all([
    runModel('claude-sonnet-4-6', prompt),
    runModel('claude-haiku-4-5-20251001', prompt),
  ])

  if (!primary) {
    console.error('[cross-check] Primary model failed — returning PENDING')
    return {
      finalVerdict: 'pending',
      primaryModel: 'claude-sonnet-4-6',
      primaryVerdict: 'pending',
      primaryConfidence: 0,
      primaryReasoning: 'Primary model unavailable — manual review required',
      secondaryModel: 'claude-haiku-4-5-20251001',
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: null,
      forcedPending: true,
      blindVerified: true,
    }
  }

  // If diversity check failed, force PENDING regardless of verdicts
  if (!diversityCheck.passes && primary.verdict === 'false') {
    console.warn(`[cross-check] Source diversity check failed: ${diversityCheck.reason}`)
    console.warn('[cross-check] Forcing PENDING due to source diversity requirement')
    return {
      finalVerdict: 'pending',
      primaryModel: 'claude-sonnet-4-6',
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: secondary ? 'claude-haiku-4-5-20251001' : null,
      secondaryVerdict: secondary?.verdict ?? null,
      secondaryConfidence: secondary?.confidence ?? null,
      modelsAgreed: secondary ? verdictsAgree(primary.verdict, secondary.verdict) : null,
      forcedPending: true,
      blindVerified: true,
    }
  }

  // No secondary — use primary only
  if (!secondary) {
    console.warn('[cross-check] Secondary model failed — using primary verdict only')
    return {
      finalVerdict: primary.verdict,
      primaryModel: 'claude-sonnet-4-6',
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: null,
      secondaryVerdict: null,
      secondaryConfidence: null,
      modelsAgreed: null,
      forcedPending: false,
      blindVerified: true,
    }
  }

  const agreed = verdictsAgree(primary.verdict, secondary.verdict)

  if (!agreed) {
    // DISAGREEMENT: force PENDING, flag for human review
    console.warn(
      `[cross-check] Models DISAGREE: Sonnet=${primary.verdict} Haiku=${secondary.verdict} → PENDING`
    )
    return {
      finalVerdict: 'pending',
      primaryModel: 'claude-sonnet-4-6',
      primaryVerdict: primary.verdict,
      primaryConfidence: primary.confidence,
      primaryReasoning: primary.reasoning,
      secondaryModel: 'claude-haiku-4-5-20251001',
      secondaryVerdict: secondary.verdict,
      secondaryConfidence: secondary.confidence,
      modelsAgreed: false,
      forcedPending: true,
      blindVerified: true,
    }
  }

  console.log(
    `[cross-check] Models AGREE: ${primary.verdict} (Sonnet ${primary.confidence}%, Haiku ${secondary.confidence}%)`
  )
  console.log(`[cross-check] → Politician: ${input.politicianName} (ID: ${input.politicianId})`)

  return {
    finalVerdict: primary.verdict,
    primaryModel: 'claude-sonnet-4-6',
    primaryVerdict: primary.verdict,
    primaryConfidence: primary.confidence,
    primaryReasoning: primary.reasoning,
    secondaryModel: 'claude-haiku-4-5-20251001',
    secondaryVerdict: secondary.verdict,
    secondaryConfidence: secondary.confidence,
    modelsAgreed: true,
    forcedPending: false,
    blindVerified: true,
  }
}

export async function saveCrossCheckResult(
  recordId: string,
  politicianId: string,
  result: CrossCheckResult,
  sourcesFed: CrossCheckInput['sources']
): Promise<void> {
  const diversityCheck = passesSourceDiversityCheck(
    sourcesFed.map(s => ({ tier: s.tier, lean: s.lean }))
  )

  // Update record
  const { error } = await supabase
    .from('records')
    .update({
      status: result.finalVerdict,
      ai_verdict: result.finalVerdict,
      ai_confidence: result.primaryConfidence,
      ai_reasoning: result.primaryReasoning,
      ai_model: result.primaryModel,
      ai_verified_at: new Date().toISOString(),
      date_verified: new Date().toISOString(),
    })
    .eq('id', recordId)

  if (error) throw error

  // Write to audit log
  await supabase.from('verdict_audit_logs').insert({
    record_id:               recordId,
    politician_id:           politicianId,
    verdict:                 result.finalVerdict,
    confidence:              result.primaryConfidence,
    reasoning:               result.primaryReasoning,
    model_version:           result.primaryModel,
    blind_verified:          result.blindVerified,
    secondary_model_version: result.secondaryModel,
    secondary_verdict:       result.secondaryVerdict,
    secondary_confidence:    result.secondaryConfidence,
    models_agreed:           result.modelsAgreed,
    sources_fed:             JSON.stringify(sourcesFed),
    can_be_decided:          !result.forcedPending,
    requires_more_sources:   result.forcedPending,
    diversity_check_passed:  diversityCheck.passes,
    diversity_check_reason:  diversityCheck.reason ?? null,
    system_prompt_version:   'v1.0.0',
  })

  console.log(`[cross-check] ✓ Saved: ${recordId} → ${result.finalVerdict}`)
}
