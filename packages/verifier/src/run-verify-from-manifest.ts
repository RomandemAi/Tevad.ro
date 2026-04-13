/**
 * Curated pilot: upsert records + sources from JSON, run dual-model blind verification,
 * persist verdict + audit log, recalc politician score.
 *
 * Env: ANTHROPIC_API_KEY, SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Optional: copy repo-root `.env` into process (see loadEnvFiles below).
 *
 * Run from repo root:
 *   npm run verify:pilot -w @tevad/verifier
 * Or:
 *   npx tsx packages/verifier/src/run-verify-from-manifest.ts [path/to/manifest.json]
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getLean, getSourceTier } from '../../rss-monitor/src/sources.config'
import type { SourceLean } from '../../rss-monitor/src/sources.config'
import { crossCheckVerify, saveCrossCheckResult, type CrossCheckInput } from './cross-check'

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
    console.log('[verify:pilot] Loaded env from', p)
    return
  }
}

interface ManifestSource {
  tier: number
  outlet: string
  url: string
  title?: string
  excerpt?: string
  published_at?: string
  archived_url?: string
}

interface ManifestEntry {
  politician_slug: string
  record_slug: string
  type: 'promise' | 'statement' | 'vote'
  text: string
  context?: string
  topic?: string
  date_made: string
  impact_level: 'high' | 'medium' | 'low'
  sources: ManifestSource[]
}

interface Manifest {
  version: number
  entries: ManifestEntry[]
}

/** Verifier package has no generated `Database` types — use loose client for inserts/updates. */
function getSupabase(): SupabaseClient<any, 'public', any> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<any, 'public', any>(url, key, { auth: { persistSession: false } })
}

function tierToDb(t: number): '0' | '1' | '2' {
  if (t === 0) return '0'
  if (t === 1) return '1'
  return '2'
}

function toCrossSources(sources: ManifestSource[]): CrossCheckInput['sources'] {
  return sources.map(s => {
    const inferred = getSourceTier(s.url)
    const tier = typeof inferred === 'number' ? inferred : Math.min(2, Math.max(0, s.tier))
    const lean = (getLean(s.url) ?? undefined) as SourceLean | undefined
    return {
      outlet: s.outlet,
      url: s.url,
      tier,
      lean: lean ?? undefined,
      title: s.title,
      excerpt: s.excerpt,
      publishedAt: s.published_at,
    }
  })
}

async function upsertRecordAndSources(
  supabase: SupabaseClient<any, 'public', any>,
  polId: string,
  e: ManifestEntry
): Promise<string> {
  const { data: existing } = await supabase.from('records').select('id').eq('slug', e.record_slug).maybeSingle()

  let recordId: string
  if (existing?.id) {
    recordId = existing.id
    const { error: uErr } = await supabase
      .from('records')
      .update({
        politician_id: polId,
        type: e.type,
        text: e.text,
        context: e.context ?? null,
        topic: e.topic ?? null,
        date_made: e.date_made,
        impact_level: e.impact_level,
        status: 'pending',
        ai_verdict: null,
        ai_confidence: null,
        ai_reasoning: null,
        ai_model: null,
        ai_verified_at: null,
        date_verified: null,
      })
      .eq('id', recordId)
    if (uErr) throw new Error(`Update record ${e.record_slug}: ${uErr.message}`)
  } else {
    const { data: ins, error: iErr } = await supabase
      .from('records')
      .insert({
        politician_id: polId,
        slug: e.record_slug,
        type: e.type,
        text: e.text,
        context: e.context ?? null,
        topic: e.topic ?? null,
        status: 'pending',
        date_made: e.date_made,
        impact_level: e.impact_level,
      })
      .select('id')
      .single()
    if (iErr || !ins) throw new Error(`Insert record ${e.record_slug}: ${iErr?.message}`)
    recordId = ins.id
  }

  await supabase.from('sources').delete().eq('record_id', recordId)

  for (const s of e.sources) {
    const inferred = getSourceTier(s.url)
    const tierNum = typeof inferred === 'number' ? inferred : s.tier
    const { error: sErr } = await supabase.from('sources').insert({
      record_id: recordId,
      tier: tierToDb(tierNum),
      outlet: s.outlet,
      url: s.url,
      archived_url: s.archived_url ?? null,
      title: s.title ?? null,
      published_at: s.published_at ?? null,
    })
    if (sErr) throw new Error(`Source insert ${e.record_slug}: ${sErr.message}`)
  }

  return recordId
}

async function main() {
  loadEnvFiles()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[verify:pilot] Missing ANTHROPIC_API_KEY')
    process.exit(1)
  }

  const manifestPath =
    process.argv[2] ?? resolve(process.cwd(), 'packages/verifier/curated-pilot.manifest.json')
  if (!existsSync(manifestPath)) {
    console.error('[verify:pilot] Manifest not found:', manifestPath)
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
    console.error('[verify:pilot] Invalid manifest version or entries')
    process.exit(1)
  }

  const supabase = getSupabase()
  const { recalcScore, saveScore } = await import('./score')

  for (const e of manifest.entries) {
    console.log('\n[verify:pilot] ──', e.record_slug)
    try {
      if (e.sources.length < 2) {
        throw new Error('Each entry needs at least 2 sources (see NEUTRALITY / diversity rules).')
      }

      const { data: pol, error: pErr } = await supabase
        .from('politicians')
        .select('id, name, role')
        .eq('slug', e.politician_slug)
        .maybeSingle()

      if (pErr || !pol) {
        throw new Error(`Politician not found: ${e.politician_slug}`)
      }

      const recordId = await upsertRecordAndSources(supabase, pol.id, e)
      const crossSources = toCrossSources(e.sources)

      const input: CrossCheckInput = {
        politicianName: pol.name,
        politicianId: pol.id,
        statementText: e.text,
        statementDate: e.date_made,
        statementType: e.type,
        sources: crossSources,
      }

      const result = await crossCheckVerify(input)
      await saveCrossCheckResult(recordId, pol.id, result, crossSources)

      const components = await recalcScore(pol.id)
      await saveScore(pol.id, components, 'curated_pilot_manifest', recordId, { skipReasonExplain: true })

      console.log('[verify:pilot] ✓', e.record_slug, '→', result.finalVerdict, '| score →', components.total)
    } catch (err) {
      console.error('[verify:pilot] ✗', e.record_slug, (err as Error).message)
    }
  }

  console.log('\n[verify:pilot] Done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
