/**
 * packages/verifier/src/verify.ts
 * Tevad.ro — Claude AI Verification Pipeline (canonical entry)
 *
 * BLIND VERIFICATION: politician identity is never sent to models.
 * System prompt: prompts/neutrality-system-prompt.md (see neutrality-prompt.ts).
 *
 * Run: npx tsx packages/verifier/src/verify.ts --demo
 */

import { passesSourceDiversityCheck } from '../../rss-monitor/src/sources.config'
import type { SourceLean } from '../../rss-monitor/src/sources.config'
import { buildBlindPayload } from './blind-payload'
import { buildBlindUserPrompt } from './prompt-utils'
import { getVerificationSystemPrompt, runVerificationModel } from './model-runner'
import { crossCheckVerify, saveCrossCheckResult, type CrossCheckResult } from './cross-check'
import type { BlindPayload, ModelResult, StatementType, Verdict } from './blind-types'

export type { BlindPayload, BlindSource, ModelResult, StatementType, Verdict } from './blind-types'
export { buildBlindPayload } from './blind-payload'
export { saveCrossCheckResult } from './cross-check'

export interface VerificationInput {
  politicianName: string
  politicianId: string
  politicianRole: string
  statementText: string
  statementDate: string
  statementType: StatementType
  sources: Array<{
    outlet: string
    url: string
    tier: number
    title?: string
    excerpt?: string
    publishedAt?: string
    lean?: SourceLean
  }>
}

export interface VerificationResult {
  verdict: Verdict
  confidence: number
  reasoning: string
  canBeDecided: boolean
  requiresMoreSources: boolean
  primaryModelUsed: string
  blindVerified: true
  modelsAgreed: boolean | null
  secondaryModel: string | null
  secondaryVerdict: Verdict | null
}

/** Tier-1 source diversity for FALSE (see SOURCES.md / NEUTRALITY.md). */
export function checkSourceDiversity(sources: Array<{ tier: number; lean?: SourceLean }>): {
  diverse: boolean
  reason?: string
} {
  const r = passesSourceDiversityCheck(sources)
  return { diverse: r.passes, reason: r.reason }
}

/** Single-model call on a blind payload (used for tests / tooling). */
export async function runModel(payload: BlindPayload, model: string): Promise<ModelResult | null> {
  const systemPrompt = getVerificationSystemPrompt()
  const userPrompt = buildBlindUserPrompt(payload)
  const out = await runVerificationModel(model, userPrompt, systemPrompt)
  return out?.parsed ?? null
}

/** Dual-model blind verification (Sonnet + Haiku). */
export async function verifyStatement(input: VerificationInput): Promise<VerificationResult> {
  const r = await crossCheckVerify({
    politicianName: input.politicianName,
    politicianId: input.politicianId,
    statementText: input.statementText,
    statementDate: input.statementDate,
    statementType: input.statementType,
    sources: input.sources,
  })

  return {
    verdict: r.finalVerdict,
    confidence: r.primaryConfidence,
    reasoning: r.primaryReasoning,
    canBeDecided: !r.forcedPending,
    requiresMoreSources: r.forcedPending,
    primaryModelUsed: r.primaryModel,
    blindVerified: true,
    modelsAgreed: r.modelsAgreed,
    secondaryModel: r.secondaryModel,
    secondaryVerdict: r.secondaryVerdict,
  }
}

/** Persists cross-check outcome + audit log row (requires full cross-check result). */
export async function saveVerification(
  recordId: string,
  politicianId: string,
  result: CrossCheckResult,
  sourcesFed: VerificationInput['sources']
): Promise<void> {
  return saveCrossCheckResult(recordId, politicianId, result, sourcesFed)
}

async function demo() {
  console.log('[verify] Running BLIND dual-model demo (--demo)...\n')

  const testInput: VerificationInput = {
    politicianName: 'Marcel Ciolacu',
    politicianId: 'demo-id-123',
    politicianRole: 'Prim-ministru',
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

  const diversity = checkSourceDiversity(testInput.sources.map(s => ({ tier: s.tier, lean: s.lean })))
  console.log('[verify] checkSourceDiversity:', JSON.stringify(diversity))

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
