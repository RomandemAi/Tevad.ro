/**
 * Backfill `reaction_fingerprint_trust` from existing `reactions`.
 *
 * Usage:
 *   npm run backfill:fingerprint-trust -w @tevad/verifier -- --dry-run --limit 20
 *   npm run backfill:fingerprint-trust -w @tevad/verifier
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
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

function trustScoreHeuristic(params: { ageDays: number; distinctRecords: number; totalReactions: number }): number {
  const age = Math.max(0, params.ageDays)
  const dr = Math.max(0, params.distinctRecords)
  const tr = Math.max(0, params.totalReactions)

  // Start at 1.0; reward longevity and breadth; penalize high-volume low-breadth bursts.
  const ageBoost = clamp(Math.log1p(age) / Math.log(60), 0, 1) // ~0..1 around 60 days
  const breadthBoost = clamp(Math.log1p(dr) / Math.log(25), 0, 1) // ~0..1 around 25 records
  const burstPenalty = dr > 0 ? clamp(tr / dr, 1, 30) : 30
  const burstFactor = clamp(1.25 - Math.log1p(burstPenalty) / Math.log(30), 0.3, 1.25)

  return clamp(0.8 + 0.7 * ageBoost + 0.7 * breadthBoost, 0.5, 2.2) * burstFactor
}

async function main(): Promise<void> {
  loadEnvFiles()
  const { dryRun, limit } = parseArgs(process.argv.slice(2))

  const url = getServiceSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Pull reactions in pages and aggregate by fingerprint.
  const pageSize = 2000
  let from = 0
  let done = false

  type Agg = {
    first: string
    last: string
    total: number
    recordIds: Set<string>
  }
  const byFp = new Map<string, Agg>()

  while (!done) {
    const { data, error } = await supabase
      .from('reactions')
      .select('fingerprint, record_id, created_at')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ fingerprint: string; record_id: string; created_at: string }>
    if (rows.length === 0) break
    from += rows.length
    if (rows.length < pageSize) done = true

    for (const r of rows) {
      const fp = String(r.fingerprint || '').trim()
      if (!fp) continue
      const cur = byFp.get(fp)
      if (!cur) {
        byFp.set(fp, {
          first: String(r.created_at),
          last: String(r.created_at),
          total: 1,
          recordIds: new Set([String(r.record_id)]),
        })
      } else {
        cur.total += 1
        cur.last = String(r.created_at)
        cur.recordIds.add(String(r.record_id))
      }
    }
  }

  const all = Array.from(byFp.entries()).map(([fingerprint, agg]) => {
    const first = new Date(agg.first)
    const last = new Date(agg.last)
    const ageDays = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
    const distinctRecords = agg.recordIds.size
    const trust = trustScoreHeuristic({ ageDays, distinctRecords, totalReactions: agg.total })
    return {
      fingerprint,
      first_seen_at: agg.first,
      last_seen_at: agg.last,
      total_reactions: agg.total,
      distinct_records: distinctRecords,
      trust_score: clamp(trust, 0, 3),
      updated_at: new Date().toISOString(),
    }
  })

  const take = limit > 0 ? Math.min(limit, all.length) : all.length
  console.log(JSON.stringify({ ok: true, dry_run: dryRun, fingerprints: all.length, will_upsert: take }, null, 2))

  const batchSize = 200
  let upserted = 0
  for (let i = 0; i < take; i += batchSize) {
    const batch = all.slice(i, i + batchSize)
    if (dryRun) {
      console.log(JSON.stringify({ sample: batch.slice(0, 2) }, null, 2))
      break
    }
    const { error } = await supabase.from('reaction_fingerprint_trust').upsert(batch as any, {
      onConflict: 'fingerprint',
    })
    if (error) throw error
    upserted += batch.length
    console.log(JSON.stringify({ ok: true, upserted }, null, 2))
  }

  console.log(JSON.stringify({ ok: true, done: true, dry_run: dryRun, upserted }, null, 2))
}

main().catch(e => {
  console.error('[backfill-fingerprint-trust] Fatal:', e)
  process.exit(1)
})

