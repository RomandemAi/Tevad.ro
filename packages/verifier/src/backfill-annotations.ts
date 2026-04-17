/**
 * Backfill `record_ai_annotations` for records that don't have one yet.
 *
 * Usage:
 *   pnpm --filter @tevad/verifier backfill-annotations --dry-run --limit 5
 *   pnpm --filter @tevad/verifier backfill-annotations
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { classifyClaim as classifyClaimInternal } from './models'

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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[k] === undefined) process.env[k] = v
    }
    return
  }
}

function getServiceSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function parseArgs(argv: string[]) {
  const args = { dryRun: false, limit: 0 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    if (a === '--limit') {
      const n = Number(argv[i + 1] ?? '')
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n)
      i++
    }
  }
  return args
}

type CompatInput = { text: string; context?: string; topic?: string }
type CompatOutput = {
  claim_kind: string
  measurability: string
  suggested_type: string
  confidence: number
  reasoning?: string | null
  model_version?: string
}

/**
 * Compatibility adapter:
 * - Caller expects: classifyClaim({ text, context?, topic? })
 * - Repo implementation is: classifyClaim({ type, text, date })
 */
async function classifyClaim(input: CompatInput & { type: 'promise' | 'statement' | 'vote'; date: string }): Promise<CompatOutput> {
  const extra: string[] = []
  if (input.topic) extra.push(`TOPIC: ${input.topic}`)
  if (input.context) extra.push(`CONTEXT: ${input.context}`)
  const text = extra.length ? `${input.text}\n\n${extra.join('\n')}` : input.text

  const out = await classifyClaimInternal({
    type: input.type,
    text,
    date: input.date,
  })

  return {
    claim_kind: out.claim_kind,
    measurability: out.measurability,
    suggested_type: out.suggested_type,
    confidence: out.confidence,
    reasoning: out.reasoning,
    model_version: out.model_version,
  }
}

async function main(): Promise<void> {
  loadEnvFiles()
  const { dryRun, limit } = parseArgs(process.argv.slice(2))

  const url = getServiceSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const take = limit > 0 ? Math.min(200, limit) : 200

  // Prefer a single query: "records with no annotations".
  const q = supabase
    .from('records')
    .select('id, politician_id, type, text, date_made, topic, created_at, record_ai_annotations!left(id)')
    .is('record_ai_annotations.id', null)
    .order('created_at', { ascending: true })
    .limit(take)

  const { data, error } = await q
  if (error) throw error

  const rows =
    (data ?? []) as Array<{
      id: string
      politician_id: string
      type: 'promise' | 'statement' | 'vote' | string
      text: string
      date_made: string
      topic: string | null
    }>

  console.log(
    JSON.stringify(
      { ok: true, dry_run: dryRun, found: rows.length, limit: limit || null, at: new Date().toISOString() },
      null,
      2
    )
  )

  let processed = 0
  for (const r of rows) {
    if (limit > 0 && processed >= limit) break
    processed++

    const type =
      r.type === 'promise' || r.type === 'statement' || r.type === 'vote'
        ? (r.type as 'promise' | 'statement' | 'vote')
        : 'statement'
    const date = (r.date_made || new Date().toISOString().slice(0, 10)).slice(0, 10)

    const ann = await classifyClaim({
      type,
      date,
      text: String(r.text || '').trim(),
      topic: r.topic ?? undefined,
    })

    const payload = {
      record_id: r.id,
      politician_id: r.politician_id,
      claim_kind: ann.claim_kind,
      measurability: ann.measurability,
      suggested_type: ann.suggested_type,
      confidence: ann.confidence,
      reasoning: ann.reasoning ?? null,
      model_version: ann.model_version ?? null,
    }

    if (dryRun) {
      console.log(JSON.stringify({ record_id: r.id, type, date, topic: r.topic, annotation: payload }, null, 2))
      continue
    }

    const { error: insErr } = await supabase.from('record_ai_annotations').insert(payload as any)
    if (insErr) {
      console.warn('[backfill] insert failed:', r.id, insErr.message)
      continue
    }
    console.log(JSON.stringify({ ok: true, inserted: r.id, suggested_type: ann.suggested_type, confidence: ann.confidence }))
  }

  console.log(JSON.stringify({ ok: true, done: true, processed, dry_run: dryRun, at: new Date().toISOString() }))
}

main().catch(e => {
  console.error('[backfill-annotations] Fatal:', e)
  process.exit(1)
})

