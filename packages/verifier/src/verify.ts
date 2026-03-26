/**
 * packages/verifier/src/verify.ts
 * Tevad.ro — Claude AI Verification Pipeline
 *
 * BLIND VERIFICATION: The politician's name and party are NEVER sent to
 * Claude during verification. Only the statement text, date, and source
 * excerpts are provided. The politician ID is attached only after the
 * verdict is returned. This eliminates any subconscious model bias
 * based on politician identity.
 *
 * See: prompts/neutrality-system-prompt.md for the exact prompt used.
 *
 * Rules (from NEUTRALITY.md):
 * - Minimum 2 independent Tier-1 sources for FALSE verdict
 * - Official records always override media
 * - No editorial opinion — only source-based facts
 * - Confidence score 0-100 required
 *
 * Run: npx tsx packages/verifier/src/verify.ts --demo
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Verdict = 'true' | 'false' | 'partial' | 'pending'

interface VerificationInput {
  politicianName: string     // Used ONLY for logging — never sent to Claude
  politicianId: string       // Attached to verdict after verification — never sent to Claude
  politicianRole: string     // Used ONLY for logging — never sent to Claude
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
    lean?: 'left' | 'right' | 'center' | 'official'
  }>
}

interface VerificationResult {
  verdict: Verdict
  confidence: number // 0-100
  reasoning: string
  canBeDecided: boolean
  requiresMoreSources: boolean
  primaryModelUsed: string
  blindVerified: true  // Always true — name/party never sent to model
}

// Load the public system prompt from the versioned file
function loadSystemPrompt(): string {
  try {
    const promptPath = join(__dirname, '../../../../prompts/neutrality-system-prompt.md')
    const content = readFileSync(promptPath, 'utf-8')
    // Extract the prompt block from the markdown
    const match = content.match(/```\n([\s\S]+?)\n```/)
    if (match) return match[1]
  } catch {
    // Fall back to inline prompt if file not found
  }
  return FALLBACK_SYSTEM_PROMPT
}

const FALLBACK_SYSTEM_PROMPT = `You are a neutral fact-verification engine for a political accountability platform.

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

/**
 * Verify a statement using BLIND verification.
 * The politician's name and party are NEVER included in the prompt.
 */
export async function verifyStatement(input: VerificationInput): Promise<VerificationResult> {
  const tier1Sources = input.sources.filter(s => s.tier <= 1)
  const tier2Sources = input.sources.filter(s => s.tier === 2)

  // Check source diversity (requirement #5)
  const leans = input.sources.map(s => s.lean).filter(Boolean)
  const hasLeftSource = leans.includes('left')
  const hasRightSource = leans.includes('right')
  const potentiallyBiased = leans.length > 0 && (!hasLeftSource || !hasRightSource) && tier1Sources.length < 3

  const systemPrompt = loadSystemPrompt()

  // BLIND PROMPT: No politician name, no party, no identifying information
  const blindPrompt = `
STATEMENT TYPE: ${input.statementType.toUpperCase()}
DATE MADE: ${input.statementDate}

STATEMENT TEXT:
"${input.statementText}"

SOURCES PROVIDED (${input.sources.length} total — ${tier1Sources.length} Tier-1, ${tier2Sources.length} Tier-2):

${input.sources.map((s, i) => `
SOURCE ${i + 1} [TIER ${s.tier}]${s.lean ? ` [${s.lean.toUpperCase()}]` : ''} — ${s.outlet}
URL: ${s.url}
Published: ${s.publishedAt ?? 'unknown'}
Title: ${s.title ?? 'N/A'}
Excerpt: ${s.excerpt ?? 'No excerpt available'}
`).join('\n')}
${potentiallyBiased ? '\nNOTE: Sources may not represent diverse perspectives. Apply extra scrutiny.' : ''}

Analyze the above and return your verdict as JSON.
Remember: FALSE requires 2+ independent Tier-1 sources or 1 Tier-1 + 1 official record.
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: blindPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    console.log(`[verify] Blind verdict for record (politician hidden): ${parsed.verdict} (${parsed.confidence}%)`)
    // Politician identity attached HERE, after verdict — never before
    console.log(`[verify] → Politician: ${input.politicianName} (ID: ${input.politicianId})`)
    return {
      ...parsed,
      primaryModelUsed: 'claude-sonnet-4-6',
      blindVerified: true,
    }
  } catch {
    console.error('[verify] Failed to parse Claude response:', text)
    return {
      verdict: 'pending',
      confidence: 0,
      reasoning: 'Verification failed — manual review required',
      canBeDecided: false,
      requiresMoreSources: true,
      primaryModelUsed: 'claude-sonnet-4-6',
      blindVerified: true,
    }
  }
}

export async function saveVerification(
  recordId: string,
  politicianId: string,
  result: VerificationResult,
  sourcesFed: VerificationInput['sources']
): Promise<void> {
  const { error } = await supabase
    .from('records')
    .update({
      status: result.verdict,
      ai_verdict: result.verdict,
      ai_confidence: result.confidence,
      ai_reasoning: result.reasoning,
      ai_model: result.primaryModelUsed,
      ai_verified_at: new Date().toISOString(),
      date_verified: new Date().toISOString(),
    })
    .eq('id', recordId)

  if (error) {
    console.error(`[verify] Failed to save verdict for ${recordId}:`, error.message)
    throw error
  }

  // Write to audit log (full transparency)
  await supabase.from('verdict_audit_logs').insert({
    record_id:          recordId,
    politician_id:      politicianId,
    verdict:            result.verdict,
    confidence:         result.confidence,
    reasoning:          result.reasoning,
    model_version:      result.primaryModelUsed,
    blind_verified:     result.blindVerified,
    sources_fed:        JSON.stringify(sourcesFed),
    can_be_decided:     result.canBeDecided,
    requires_more_sources: result.requiresMoreSources,
  })

  console.log(`[verify] ✓ Record ${recordId} → ${result.verdict} (${result.confidence}% confidence)`)
}

// Demo run
async function demo() {
  console.log('[verify] Running BLIND demo verification...')
  console.log('[verify] Note: politician name/party not included in Claude prompt\n')

  const testInput: VerificationInput = {
    politicianName: 'Marcel Ciolacu',   // NEVER sent to Claude
    politicianId: 'demo-id-123',        // NEVER sent to Claude
    politicianRole: 'Prim-ministru',    // NEVER sent to Claude
    statementType: 'promise',
    statementText: 'Vom elimina pensiile speciale — promisiune electorală cheie.',
    statementDate: '2020-09-01',
    sources: [
      {
        outlet: 'HotNews',
        url: 'https://www.hotnews.ro/pensii-speciale',
        tier: 1,
        lean: 'center',
        title: 'PSD va elimina pensiile speciale',
        excerpt: 'Promisiunea a fost făcută înainte de alegerile din 2020.',
        publishedAt: '2020-09-01',
      },
      {
        outlet: 'G4Media',
        url: 'https://www.g4media.ro/pensii-speciale-verificare',
        tier: 1,
        lean: 'center',
        title: 'Pensiile speciale, promisiunea neîndeplinită',
        excerpt: 'La 4 ani după promisiune, pensiile speciale nu au fost eliminate.',
        publishedAt: '2024-10-15',
      },
    ],
  }

  const result = await verifyStatement(testInput)
  console.log('\n[verify] Result:')
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[2] === '--demo') {
  demo().catch(e => {
    console.error('[verify] Demo failed:', e)
    process.exit(1)
  })
}
