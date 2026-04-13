/**
 * Read-only audit: active `politicians` rows vs official deputy / senator / cabinet rosters
 * (same sources as cdep / senat / gov scrapers). Does not modify the database.
 *
 * Run: npm run audit:parliament -w @tevad/scraper
 * Flags: --json | --full-deputy-roster (skip OpenPolitics narrowing for deputat list)
 */

import { createServiceClient } from './supabase-env'
import { nameIdentitySignature, nameIdentityTokens } from './name-identity'
import {
  dedupeDeputiesByNameIdentity,
  fetchDeputyRoster,
  fetchOpenPoliticsDeputyRoster,
  type DeputyInput,
  type DeputyRosterResult,
} from './cdep'
import { fetchSenatorRoster } from './senat'
import type { SenatorRow } from './senat'
import { fetchCabinetRoster } from './gov'
import type { CabinetMember } from './gov'

type IssueType = 'not_in_roster' | 'name_mismatch' | 'skipped_chamber'

interface Finding {
  type: Exclude<IssueType, 'skipped_chamber'>
  id: string
  slug: string
  name: string
  chamber: string
  detail: string
  /** Best fuzzy roster match when type is not_in_roster (token Jaccard). */
  suggestion?: { officialName: string; score: number }
}

/** Jaccard similarity on slugified name tokens (handles reorder; partial overlap on surnames). */
function tokenSetsJaccard(a: string, b: string): number {
  const ta = new Set(nameIdentityTokens(a))
  const tb = new Set(nameIdentityTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const x of ta) if (tb.has(x)) inter++
  const u = ta.size + tb.size - inter
  return u === 0 ? 0 : inter / u
}

function closestRosterName<T extends { name: string }>(
  dbName: string,
  roster: T[],
  minScore = 0.28
): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null
  for (const row of roster) {
    const score = tokenSetsJaccard(dbName, row.name)
    if (!best || score > best.score) best = { name: row.name, score }
  }
  if (best && best.score >= minScore) return best
  return null
}

/**
 * data.gov.ro can return very large multi-year dumps; for audits, prefer intersecting with
 * OpenPolitics current CSV when that yields a legislature-sized set (~250–400).
 */
async function buildDeputyRosterForAudit(fullDeputyRoster: boolean): Promise<DeputyRosterResult> {
  const full = await fetchDeputyRoster()
  if (fullDeputyRoster || full.deputies.length <= 360) return full

  const op = await fetchOpenPoliticsDeputyRoster()
  if (op.length < 200) {
    console.warn(
      `[audit] Deputy roster large (${full.deputies.length}); OpenPolitics only ${op.length} — using full CKAN merge (use --full-deputy-roster to silence)`
    )
    return full
  }

  const opSigs = new Set(op.map(d => nameIdentitySignature(d.name)))
  const filtered = full.deputies.filter(d => opSigs.has(nameIdentitySignature(d.name)))
  if (filtered.length >= 240) {
    return {
      deputies: dedupeDeputiesByNameIdentity(filtered),
      source: `${full.source}+audit-openpolitics-intersect`,
    }
  }

  const opDeduped = dedupeDeputiesByNameIdentity(op)
  if (opDeduped.length >= 240) {
    console.warn(
      `[audit] OpenPolitics intersect small (${filtered.length}); using OpenPolitics-only deputy list (${opDeduped.length}) for audit`
    )
    return { deputies: opDeduped, source: 'openpolitics-audit-primary' }
  }

  console.warn('[audit] Could not narrow deputy roster; using full merged list')
  return full
}

function normName(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isCabinetChamber(ch: string): boolean {
  return ch === 'premier' || ch === 'ministru' || ch === 'minister'
}

async function main() {
  const jsonOut = process.argv.includes('--json')
  const fullDeputyRoster = process.argv.includes('--full-deputy-roster')

  const findings: Finding[] = []
  let skippedChamber = 0

  console.log('[audit] Loading official rosters…')
  const [deputyResult, senators, cabinet] = await Promise.all([
    buildDeputyRosterForAudit(fullDeputyRoster),
    fetchSenatorRoster(),
    fetchCabinetRoster(),
  ])
  const { deputies, source } = deputyResult

  const depByCdep = new Map<string, DeputyInput>()
  const depBySig = new Map<string, DeputyInput>()
  for (const d of deputies) {
    depBySig.set(nameIdentitySignature(d.name), d)
    if (d.externalId) depByCdep.set(d.externalId, d)
  }

  type SenBase = Omit<SenatorRow, 'mandateStart'>
  const senById = new Map<string, SenBase>()
  const senBySig = new Map<string, SenBase>()
  for (const s of senators) {
    senBySig.set(nameIdentitySignature(s.name), s)
    senById.set(s.senatId, s)
  }

  const cabBySig = new Map<string, CabinetMember>()
  for (const c of cabinet) {
    cabBySig.set(nameIdentitySignature(c.name), c)
  }

  const supabase = createServiceClient()
  const { data: rows, error } = await supabase
    .from('politicians')
    .select('id, slug, name, chamber, party_short, cdep_id, senat_id, role')
    .eq('is_active', true)

  if (error) throw new Error(`politicians query: ${error.message}`)

  for (const pol of rows ?? []) {
    const ch = String(pol.chamber ?? '')
    const id = String(pol.id)
    const slug = String(pol.slug)
    const name = String(pol.name)
    const sig = nameIdentitySignature(name)

    if (ch === 'deputat') {
      const cid = pol.cdep_id != null && pol.cdep_id !== '' ? String(pol.cdep_id) : null
      let official: DeputyInput | undefined
      if (cid && depByCdep.has(cid)) official = depByCdep.get(cid)
      else if (depBySig.has(sig)) official = depBySig.get(sig)

      if (!official) {
        const sug = closestRosterName(name, deputies)
        const detailBase =
          'No match in deputy roster (by cdep_id or name signature). Wrong identity, ended mandate, or non-deputat row marked as deputat.'
        const detail = sug
          ? `${detailBase} Closest deputy name on roster: "${sug.name}" (token similarity ${sug.score.toFixed(2)}).`
          : detailBase
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail,
          suggestion: sug ? { officialName: sug.name, score: sug.score } : undefined,
        })
        continue
      }
      if (normName(official.name) !== normName(name)) {
        findings.push({
          type: 'name_mismatch',
          id,
          slug,
          name,
          chamber: ch,
          detail: `Roster name: "${official.name}" (cdep_id or signature matched)`,
        })
      }
      continue
    }

    if (ch === 'senator') {
      const sid = pol.senat_id != null && pol.senat_id !== '' ? String(pol.senat_id) : null
      let official: SenBase | undefined
      if (sid && senById.has(sid)) official = senById.get(sid)
      else if (senBySig.has(sig)) official = senBySig.get(sig)

      if (!official) {
        const sug = closestRosterName(name, senators)
        const detailBase = 'No match in senator roster (by senat_id or name signature).'
        const detail = sug
          ? `${detailBase} Closest senator name on roster: "${sug.name}" (token similarity ${sug.score.toFixed(2)}).`
          : detailBase
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail,
          suggestion: sug ? { officialName: sug.name, score: sug.score } : undefined,
        })
        continue
      }
      if (normName(official.name) !== normName(name)) {
        findings.push({
          type: 'name_mismatch',
          id,
          slug,
          name,
          chamber: ch,
          detail: `Roster name: "${official.name}" (senat_id or signature matched)`,
        })
      }
      continue
    }

    if (isCabinetChamber(ch)) {
      const official = cabBySig.get(sig)
      if (!official) {
        const sug = closestRosterName(name, cabinet)
        const detailBase = 'No match in gov.ro cabinet list (by name signature).'
        const detail = sug
          ? `${detailBase} Closest cabinet name: "${sug.name}" (token similarity ${sug.score.toFixed(2)}).`
          : detailBase
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail,
          suggestion: sug ? { officialName: sug.name, score: sug.score } : undefined,
        })
      }
      continue
    }

    skippedChamber++
  }

  const summary = {
    deputyRosterCount: deputies.length,
    deputyRosterSource: source,
    senatorRosterCount: senators.length,
    cabinetRosterCount: cabinet.length,
    activePoliticiansScanned: (rows ?? []).length,
    skippedNotAuditedChamber: skippedChamber,
    findingsCount: findings.length,
    byType: {
      not_in_roster: findings.filter(f => f.type === 'not_in_roster').length,
      name_mismatch: findings.filter(f => f.type === 'name_mismatch').length,
    },
    findings,
  }

  if (jsonOut) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('\n=== Parliament / Gov roster audit ===\n')
    console.log(`Deputy roster: ${deputies.length} (${source})${fullDeputyRoster ? ' [full CKAN merge]' : ''}`)
    if (!fullDeputyRoster) {
      console.log('Tip: --full-deputy-roster uses the raw merged CKAN list (no OpenPolitics narrowing).\n')
    }
    console.log(`Senator roster: ${senators.length}`)
    console.log(`Cabinet roster: ${cabinet.length}`)
    console.log(`Active politicians scanned: ${(rows ?? []).length}`)
    console.log(`Skipped (chamber not audited: president/other/…): ${skippedChamber}`)
    console.log(`\nIssues: ${findings.length} (not_in_roster: ${summary.byType.not_in_roster}, name_mismatch: ${summary.byType.name_mismatch})\n`)

    for (const f of findings) {
      console.log(`[${f.type}] ${f.chamber} | ${f.name}`)
      console.log(`  id=${f.id} slug=${f.slug}`)
      console.log(`  ${f.detail}\n`)
    }

    if (findings.length === 0) {
      console.log('No discrepancies detected for deputat / senator / cabinet rows.\n')
    }
  }

  console.log('[audit] Done.')
}

main().catch(e => {
  console.error('[audit] Fatal:', (e as Error).message)
  process.exit(1)
})
