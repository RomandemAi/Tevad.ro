/**
 * Anthropic models for RSS classification, score explanations, contradiction checks.
 * Uses ANTHROPIC_API_KEY (same as rest of verifier).
 */

import Anthropic from '@anthropic-ai/sdk'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

/** Sonnet — final-style reasoning, contradiction detection */
export const SONNET = 'claude-sonnet-4-6'

/** Haiku — RSS classification, short score explanations */
export const HAIKU = 'claude-haiku-4-5-20251001'

function extractJsonObject<T>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0]) as T
    } catch {
      return null
    }
  }
}

export interface ClassifyArticleResult {
  matchedPolitician: string | null
  recordType: 'promise' | 'statement' | 'vote' | null
  topic: string | null
  extractedQuote: string | null
  confidence: number
}

export async function classifyArticle(
  title: string,
  excerpt: string,
  politicianNames: string[]
): Promise<ClassifyArticleResult> {
  const empty: ClassifyArticleResult = {
    matchedPolitician: null,
    recordType: null,
    topic: null,
    extractedQuote: null,
    confidence: 0,
  }
  if (!process.env.ANTHROPIC_API_KEY) return empty

  const response = await getClient().messages.create({
    model: HAIKU,
    max_tokens: 300,
    system: `You are a classifier for a Romanian political accountability platform.
Analyze the article and return JSON only. No other text.`,
    messages: [
      {
        role: 'user',
        content: `Article title: "${title}"
Article excerpt: "${excerpt}"
Known politicians: ${politicianNames.join(', ')}

Return JSON:
{
  "matchedPolitician": "exact name from list or null",
  "recordType": "promise|statement|vote|null",
  "topic": "infrastructure|taxes|healthcare|education|corruption|economy|foreign_policy|social|pensions|transparency|coalition|other|null",
  "extractedQuote": "direct quote if present or null",
  "confidence": 0-100
}`,
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  const parsed = extractJsonObject<ClassifyArticleResult>(text)
  if (!parsed || typeof parsed.confidence !== 'number') return empty
  return {
    matchedPolitician: parsed.matchedPolitician ?? null,
    recordType: parsed.recordType ?? null,
    topic: parsed.topic ?? null,
    extractedQuote: parsed.extractedQuote ?? null,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence))),
  }
}

export async function explainScoreChange(
  politicianName: string,
  scorePrev: number,
  scoreNew: number,
  reason: string,
  recordText?: string
): Promise<string> {
  const delta = scoreNew - scorePrev
  const direction = delta > 0 ? 'crescut' : 'scăzut'
  const fallback = `Scorul a ${direction} de la ${scorePrev} la ${scoreNew} după o actualizare a înregistrărilor.`

  if (!process.env.ANTHROPIC_API_KEY) return fallback

  const response = await getClient().messages.create({
    model: HAIKU,
    max_tokens: 100,
    system:
      'Generate a single short sentence in Romanian explaining a credibility score change. Factual only. No opinion.',
    messages: [
      {
        role: 'user',
        content: `Politician: ${politicianName}
Score ${direction} de la ${scorePrev} la ${scoreNew} (${delta > 0 ? '+' : ''}${delta}).
Reason: ${reason}
${recordText ? `Record: "${recordText.slice(0, 100)}"` : ''}
One sentence Romanian explanation:`,
      },
    ],
  })

  return response.content[0]?.type === 'text'
    ? response.content[0].text.trim() || fallback
    : fallback
}

export interface ContradictionRecordInput {
  text: string
  date: string
  status: string
  topic: string
}

export interface DetectContradictionResult {
  hasContradiction: boolean
  explanation: string | null
  recordA: string | null
  recordB: string | null
}

export async function detectContradiction(
  records: ContradictionRecordInput[]
): Promise<DetectContradictionResult> {
  const none: DetectContradictionResult = {
    hasContradiction: false,
    explanation: null,
    recordA: null,
    recordB: null,
  }
  if (records.length < 2) return none
  if (!process.env.ANTHROPIC_API_KEY) return none

  const topic = records[0].topic
  const response = await getClient().messages.create({
    model: SONNET,
    max_tokens: 300,
    system: `You detect contradictions between a Romanian politician's statements over time.
Return JSON only. A contradiction means the politician clearly stated opposite positions on the same topic at different times.
Minor nuance or policy evolution is NOT a contradiction. Only flag clear direct contradictions.`,
    messages: [
      {
        role: 'user',
        content: `Statements on topic "${topic}":
${records.map(r => `[${r.date}] "${r.text}"`).join('\n')}

Return JSON:
{
  "hasContradiction": true/false,
  "explanation": "one factual sentence or null",
  "recordA": "exact text of first statement or null",
  "recordB": "exact text of contradicting statement or null"
}`,
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  const parsed = extractJsonObject<DetectContradictionResult>(text)
  if (!parsed) return none
  return {
    hasContradiction: Boolean(parsed.hasContradiction),
    explanation: parsed.explanation ?? null,
    recordA: parsed.recordA ?? null,
    recordB: parsed.recordB ?? null,
  }
}

export type ClaimKind = 'future_promise' | 'present_fact' | 'opinion_only' | 'mixed'
export type Measurability = 'high' | 'medium' | 'low' | 'non_falsifiable'
export type SuggestedType = 'promise' | 'statement' | 'vote'

export interface ClassifyClaimResult {
  claim_kind: ClaimKind
  measurability: Measurability
  suggested_type: SuggestedType
  confidence: number
  reasoning: string | null
  model_version: string
}

/**
 * Claim-kind + measurability classifier (neutral, no politics).
 * Used to suggest `records.type` and whether a claim is falsifiable.
 */
export async function classifyClaim(input: {
  type: 'promise' | 'statement' | 'vote'
  text: string
  date: string
}): Promise<ClassifyClaimResult> {
  const fallback: ClassifyClaimResult = {
    claim_kind: input.type === 'promise' ? 'future_promise' : input.type === 'vote' ? 'present_fact' : 'present_fact',
    measurability: input.type === 'statement' ? 'medium' : 'high',
    suggested_type: input.type,
    confidence: 50,
    reasoning: null,
    model_version: HAIKU,
  }
  if (!process.env.ANTHROPIC_API_KEY) return fallback

  const response = await getClient().messages.create({
    model: HAIKU,
    max_tokens: 200,
    system:
      'You are a neutral classifier for a Romanian political accountability platform. ' +
      'Your job: classify falsifiability/measurability and whether the text is a future commitment (promise) vs a factual claim (statement) vs a vote. ' +
      'The "reasoning" field must be Romanian (one short neutral sentence) or null. ' +
      'No political framing. Return JSON only.',
    messages: [
      {
        role: 'user',
        content: `TYPE: ${input.type.toUpperCase()}
DATE: ${input.date}
TEXT: "${input.text}"

Return JSON:
{
  "claim_kind": "future_promise|present_fact|opinion_only|mixed",
  "measurability": "high|medium|low|non_falsifiable",
  "suggested_type": "promise|statement|vote",
  "confidence": 0-100,
  "reasoning": "o singură propoziție scurtă, factuală, în limba română, sau null"
}`,
      },
    ],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  const parsed = extractJsonObject<{
    claim_kind?: ClaimKind
    measurability?: Measurability
    suggested_type?: SuggestedType
    confidence?: number
    reasoning?: string | null
  }>(text)
  if (!parsed) return fallback

  const ck =
    parsed.claim_kind === 'future_promise' ||
    parsed.claim_kind === 'present_fact' ||
    parsed.claim_kind === 'opinion_only' ||
    parsed.claim_kind === 'mixed'
      ? parsed.claim_kind
      : fallback.claim_kind

  const meas =
    parsed.measurability === 'high' ||
    parsed.measurability === 'medium' ||
    parsed.measurability === 'low' ||
    parsed.measurability === 'non_falsifiable'
      ? parsed.measurability
      : fallback.measurability

  const st =
    parsed.suggested_type === 'promise' || parsed.suggested_type === 'statement' || parsed.suggested_type === 'vote'
      ? parsed.suggested_type
      : fallback.suggested_type

  const conf = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : fallback.confidence

  return {
    claim_kind: ck,
    measurability: meas,
    suggested_type: st,
    confidence: conf,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() || null : null,
    model_version: HAIKU,
  }
}
