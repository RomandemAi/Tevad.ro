/**
 * Read-only audit: active `politicians` rows vs official deputy / senator / cabinet rosters
 * (same sources as cdep / senat / gov scrapers). Does not modify the database.
 *
 * Run: npm run audit:parliament -w @tevad/scraper
 */

import { createServiceClient } from './supabase-env'
import { nameIdentitySignature } from './name-identity'
import { fetchDeputyRoster } from './cdep'
import type { DeputyInput } from './cdep'
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

  const findings: Finding[] = []
  let skippedChamber = 0

  console.log('[audit] Loading official rosters…')
  const [deputyResult, senators, cabinet] = await Promise.all([
    fetchDeputyRoster(),
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
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail:
            'No match in deputy roster (by cdep_id or name signature). Possible wrong person, ended mandate, or stale row.',
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
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail: 'No match in senator roster (by senat_id or name signature).',
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
        findings.push({
          type: 'not_in_roster',
          id,
          slug,
          name,
          chamber: ch,
          detail: 'No match in gov.ro cabinet list (by name signature).',
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
    console.log(`Deputy roster: ${deputies.length} (${source})`)
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
