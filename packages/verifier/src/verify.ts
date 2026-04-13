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

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { getLean, getSourceTier } from '../../rss-monitor/src/sources.config'

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
    console.log('[verify] Loaded env from', p)
    return
  }
}

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceSupabase() {
  const url = getServiceSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<any, 'public', any>(url, key, { auth: { persistSession: false } })
}

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
  loadEnvFiles()
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

async function runPending(): Promise<void> {
  loadEnvFiles()

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const supabase = getServiceSupabase()
  const { recalcScore, saveScore } = await import('./score')

  const limitRaw = process.env.VERIFY_LIMIT
  const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10))

  const { data: records, error: rErr } = await supabase
    .from('records')
    .select('id, politician_id, slug, type, text, date_made, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (rErr) throw new Error(`Fetch pending records: ${rErr.message}`)

  if (!records || records.length === 0) {
    console.log('[verify] No pending records.')
    return
  }

  console.log(`[verify] Processing ${records.length} pending record(s)...`)

  const results: Array<{ slug: string; verdict: string; confidence: number }> = []

  for (const rec of records) {
    const recordId = rec.id as string
    const politicianId = rec.politician_id as string
    const slug = (rec.slug as string) || recordId

    const { data: pol, error: pErr } = await supabase
      .from('politicians')
      .select('id, name, role')
      .eq('id', politicianId)
      .maybeSingle()
    if (pErr || !pol) {
      console.warn('[verify] skip (politician missing):', slug, pErr?.message)
      continue
    }

    const { data: srcRows, error: sErr } = await supabase
      .from('sources')
      .select('outlet, url, tier, title, published_at')
      .eq('record_id', recordId)

    if (sErr) {
      console.warn('[verify] skip (sources query failed):', slug, sErr.message)
      continue
    }

    const sources = (srcRows ?? []).map((s: any) => {
      const url = String(s.url || '')
      const inferredTier = getSourceTier(url)
      const tierNum =
        typeof inferredTier === 'number'
          ? inferredTier
          : s.tier === '0' || s.tier === '1' || s.tier === '2'
            ? Number(s.tier)
            : 2
      const lean = (getLean(url) ?? undefined) as SourceLean | undefined
      return {
        outlet: String(s.outlet || 'Source'),
        url,
        tier: tierNum,
        lean,
        title: s.title ?? undefined,
        publishedAt: s.published_at ? String(s.published_at) : undefined,
      }
    })

    const input: VerificationInput = {
      politicianName: pol.name,
      politicianId: pol.id,
      politicianRole: pol.role ?? '',
      statementText: rec.text as string,
      statementDate: String(rec.date_made),
      statementType: rec.type as StatementType,
      sources,
    }

    console.log('\n[verify] ──', slug)
    const cc = await crossCheckVerify({
      politicianName: input.politicianName,
      politicianId: input.politicianId,
      statementText: input.statementText,
      statementDate: input.statementDate,
      statementType: input.statementType,
      sources: input.sources,
    })

    await saveCrossCheckResult(recordId, politicianId, cc, input.sources)

    const components = await recalcScore(politicianId)
    await saveScore(politicianId, components, 'pending_record_verified', recordId, {
      skipReasonExplain: true,
    })

    results.push({ slug, verdict: cc.finalVerdict, confidence: cc.primaryConfidence })
    console.log(`[verify] ✓ ${slug} → ${cc.finalVerdict} (${cc.primaryConfidence}%)`)
  }

  console.log('\n[verify] Done.')
  console.log(`[verify] Verified: ${results.length}`)
  for (const r of results) console.log(`[verify] - ${r.slug}: ${r.verdict} (${r.confidence}%)`)
}

if (process.argv[2] === '--demo') {
  demo().catch(e => {
    console.error('[verify] Demo failed:', e)
    process.exit(1)
  })
}

if (process.argv.includes('--run-pending')) {
  runPending().catch(e => {
    console.error('[verify] runPending failed:', e)
    process.exit(1)
  })
}
