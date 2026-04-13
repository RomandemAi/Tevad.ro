/**
 * Upsert all 465 MPs (331 deputați + 134 senatori) from data/parlamentari-2024-2028.json
 * into public.politicians (mandate 2024-12-01). Regenerate JSON:
 *   node scripts/build-parlamentari-from-wikipedia.mjs
 *
 * Run:
 *   npx tsx packages/scraper/src/import-bec-2024.ts
 *   npx tsx packages/scraper/src/import-bec-2024.ts --dry-run   # no DB; validate + sample logs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServiceClient } from './supabase-env'
import { makeSlug } from './cdep'
import { partyColors } from './party-colors'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface Entry {
  county: string
  chamber: 'deputat' | 'senator'
  name: string
  partyShort: string
  party: string
}

interface Payload {
  mandate_start: string
  entries: Entry[]
}

function main() {
  const jsonPath = join(__dirname, '..', 'data', 'parlamentari-2024-2028.json')
  const raw = readFileSync(jsonPath, 'utf8')
  const data = JSON.parse(raw) as Payload
  const entries = data.entries
  const mandateStart = data.mandate_start ?? '2024-12-01'

  const dep = entries.filter(e => e.chamber === 'deputat')
  const sen = entries.filter(e => e.chamber === 'senator')
  if (dep.length !== 331 || sen.length !== 134 || entries.length !== 465) {
    throw new Error(`Expected 331 deputați + 134 senatori (=465), got ${dep.length}+${sen.length}=${entries.length}`)
  }

  const ordered = [...dep, ...sen]
  const pad = String(ordered.length).length

  return { ordered, mandateStart, pad, jsonPath }
}

function printPartyBreakdown(ordered: Entry[]) {
  const byParty = new Map<string, { deputat: number; senator: number }>()
  for (const e of ordered) {
    if (!byParty.has(e.partyShort)) byParty.set(e.partyShort, { deputat: 0, senator: 0 })
    const b = byParty.get(e.partyShort)!
    if (e.chamber === 'deputat') b.deputat++
    else b.senator++
  }
  const keys = [...byParty.keys()].sort((a, b) => a.localeCompare(b))
  console.log('\n[bec] Count by party and chamber:')
  for (const k of keys) {
    const b = byParty.get(k)!
    console.log(`  ${k}: deputați ${b.deputat}, senatori ${b.senator} (total ${b.deputat + b.senator})`)
  }
}

async function run() {
  const dryRun = process.argv.includes('--dry-run')
  const { ordered, mandateStart, pad, jsonPath } = main()
  console.log(`[bec] Loading ${ordered.length} entries from ${jsonPath}`)
  if (dryRun) console.log('[bec] Dry run — no Supabase writes.')

  const usedSlugs = new Set<string>()
  let ok = 0
  let errors = 0

  const supabase = dryRun ? null : createServiceClient()

  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i]!
    const idx = String(i + 1).padStart(pad, '0')
    const slug = makeSlug(e.name, usedSlugs)
    const colors = partyColors(e.partyShort)
    const role = e.chamber === 'deputat' ? 'Deputat' : 'Senator'

    if (dryRun) {
      if (i < 3 || i === ordered.length - 1) {
        console.log(`[bec] ${idx}/${ordered.length} ${e.name} (${e.partyShort}/${e.chamber}) → slug ${slug}`)
      } else if (i === 3) {
        console.log(`[bec] … (${ordered.length - 4} more rows omitted in dry run) …`)
      }
      ok++
      continue
    }

    const { error } = await supabase!.from('politicians').upsert(
      {
        slug,
        name: e.name,
        role,
        party: e.party,
        party_short: e.partyShort,
        chamber: e.chamber,
        constituency: e.county || null,
        mandate_start: mandateStart,
        is_active: true,
        avatar_color: colors.bg,
        avatar_text_color: colors.text,
      },
      { onConflict: 'slug' }
    )

    if (error) {
      errors++
      console.error(`[bec] ${idx}/${ordered.length} ${e.name}:`, error.message)
    } else {
      ok++
      console.log(`[bec] ${idx}/${ordered.length} ${e.name} (${e.partyShort}/${e.chamber}) ✓`)
    }
  }

  printPartyBreakdown(ordered)
  console.log(`\n[bec] Done. ${ok} ok, ${errors} errors.${dryRun ? ' (dry run)' : ''}`)

  return { ok, errors }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('import-bec-2024')) {
  run().catch(err => {
    console.error('[bec] Fatal:', err)
    process.exit(1)
  })
}
