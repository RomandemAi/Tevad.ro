/**
 * packages/verifier/src/verify.ts
 * Tevad.ro — Claude AI Verification Pipeline
 *
 * Takes a flagged article + politician context and uses
 * Claude to determine TRUE / FALSE / PARTIAL / PENDING verdict.
 *
 * Rules (from NEUTRALITY.md):
 * - Minimum 2 independent Tier-1 sources for FALSE verdict
 * - Official records always override media
 * - No editorial opinion — only source-based facts
 * - Confidence score 0-100 required
 *
 * Run: npx tsx packages/verifier/src/verify.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Verdict = 'true' | 'false' | 'partial' | 'pending'

interface VerificationInput {
  politicianName: string
  politicianRole: string
  statementText: string
  statementDate: string
  statementType: 'promise' | 'statement' | 'vote'
  sources: Array<{
    outlet: string
    url: string
    tier: number
    title?: string
    excerpt?: string
    publishedAt?: string
  }>
}

interface VerificationResult {
  verdict: Verdict
  confidence: number // 0-100
  reasoning: string
  canBeDecided: boolean
  requiresMoreSources: boolean
  modelUsed: string
}

const SYSTEM_PROMPT = `You are the neutral fact-verification engine for Tevad.ro — Romania's open-source political accountability platform.

YOUR MISSION:
Determine whether a Romanian politician kept their promise, told the truth, or voted as claimed.
You have NO political opinion. You represent NO party. You serve ONLY the facts.

VERDICT OPTIONS:
- "true" — The statement/promise/vote is confirmed by sources
- "false" — The statement/promise/vote is contradicted by sources
- "partial" — Partially true or partially kept
- "pending" — Insufficient evidence to decide yet

STRICT RULES (from NEUTRALITY.md):
1. For "false" verdict: you need minimum 2 independent Tier-1 sources OR 1 Tier-1 + 1 official government record
2. Official government records (Monitorul Oficial, cdep.ro votes) ALWAYS override media
3. If evidence is mixed or insufficient → return "pending", NOT "false"
4. No editorial language. No political framing. Only: what was said, what happened, do sources confirm or deny?
5. Confidence must reflect source quality: Tier-0 official = high confidence, Tier-2 only = lower confidence

RESPONSE FORMAT (JSON only, no other text):
{
  "verdict": "true|false|partial|pending",
  "confidence": 0-100,
  "reasoning": "2-3 sentences max, factual only, no editorial opinion",
  "canBeDecided": true/false,
  "requiresMoreSources": true/false
}`

export async function verifyStatement(input: VerificationInput): Promise<VerificationResult> {
  const tier1Sources = input.sources.filter(s => s.tier <= 1)
  const tier2Sources = input.sources.filter(s => s.tier === 2)

  const userMessage = `
POLITICIAN: ${input.politicianName} (${input.politicianRole})
TYPE: ${input.statementType.toUpperCase()}
DATE: ${input.statementDate}

STATEMENT:
"${input.statementText}"

SOURCES PROVIDED (${input.sources.length} total — ${tier1Sources.length} Tier-1, ${tier2Sources.length} Tier-2):

${input.sources.map((s, i) => `
SOURCE ${i + 1} [TIER ${s.tier}] — ${s.outlet}
URL: ${s.url}
Published: ${s.publishedAt ?? 'unknown'}
Title: ${s.title ?? 'N/A'}
Excerpt: ${s.excerpt ?? 'No excerpt available'}
`).join('\n')}

Analyze the above and return your verdict as JSON.
Remember: FALSE requires 2+ independent Tier-1 sources or 1 Tier-1 + 1 official record.
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return {
      ...parsed,
      modelUsed: 'claude-sonnet-4-6',
    }
  } catch {
    console.error('[verify] Failed to parse Claude response:', text)
    return {
      verdict: 'pending',
      confidence: 0,
      reasoning: 'Verification failed — manual review required',
      canBeDecided: false,
      requiresMoreSources: true,
      modelUsed: 'claude-sonnet-4-6',
    }
  }
}

export async function saveVerification(
  recordId: string,
  result: VerificationResult
): Promise<void> {
  const { error } = await supabase
    .from('records')
    .update({
      status: result.verdict,
      ai_verdict: result.verdict,
      ai_confidence: result.confidence,
      ai_reasoning: result.reasoning,
      ai_model: result.modelUsed,
      ai_verified_at: new Date().toISOString(),
      date_verified: new Date().toISOString(),
    })
    .eq('id', recordId)

  if (error) {
    console.error(`[verify] Failed to save verdict for ${recordId}:`, error.message)
    throw error
  }

  console.log(`[verify] ✓ Record ${recordId} → ${result.verdict} (${result.confidence}% confidence)`)
}

// Demo run with test case
async function demo() {
  console.log('[verify] Running demo verification...\n')

  const testInput: VerificationInput = {
    politicianName: 'Marcel Ciolacu',
    politicianRole: 'Prim-ministru · PSD',
    statementType: 'promise',
    statementText: 'Vom elimina pensiile speciale — promisiune electorală cheie.',
    statementDate: '2020-09-01',
    sources: [
      {
        outlet: 'HotNews',
        url: 'https://www.hotnews.ro/pensii-speciale-ciolacu',
        tier: 1,
        title: 'Ciolacu: PSD va elimina pensiile speciale',
        excerpt: 'Marcel Ciolacu a promis înainte de alegerile din 2020 că PSD va elimina pensiile speciale dacă ajunge la guvernare.',
        publishedAt: '2020-09-01',
      },
      {
        outlet: 'G4Media',
        url: 'https://www.g4media.ro/pensii-speciale-verificare',
        tier: 1,
        title: 'Pensiile speciale, promisiunea neîndeplinită a PSD',
        excerpt: 'La 4 ani după promisiunea lui Ciolacu, pensiile speciale nu au fost eliminate. Legea a fost contestată și amânată repetat.',
        publishedAt: '2024-10-15',
      },
    ],
  }

  const result = await verifyStatement(testInput)
  console.log('[verify] Result:')
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[2] === '--demo') {
  demo().catch(e => {
    console.error('[verify] Demo failed:', e)
    process.exit(1)
  })
}
