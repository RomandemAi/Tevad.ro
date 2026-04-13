/**
 * After scrapers: print totals, by chamber, by party_short.
 * Run: npx tsx src/count-politicians.ts
 */

import { createServiceClient } from './supabase-env'

async function main() {
  const s = createServiceClient()
  const { count, error: cErr } = await s.from('politicians').select('*', { count: 'exact', head: true })
  if (cErr) throw cErr
  console.log('Total politicians:', count ?? 0)

  const { data: rows, error } = await s.from('politicians').select('chamber, party_short')
  if (error) throw error

  const byChamber = new Map<string, number>()
  const byParty = new Map<string, number>()
  for (const r of rows ?? []) {
    const ch = (r as { chamber: string | null }).chamber ?? 'null'
    const p = (r as { party_short: string | null }).party_short ?? 'null'
    byChamber.set(ch, (byChamber.get(ch) ?? 0) + 1)
    byParty.set(p, (byParty.get(p) ?? 0) + 1)
  }

  console.log('\nBy chamber:')
  Array.from(byChamber.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  console.log('\nBy party_short:')
  Array.from(byParty.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  const { count: wealthCount, error: wErr } = await s
    .from('wealth_declarations')
    .select('*', { count: 'exact', head: true })
  if (wErr) {
    console.log('\nWealth declarations: (table missing or error)', wErr.message)
  } else {
    console.log('\nWealth declarations (rows):', wealthCount ?? 0)
  }

  console.log('\nDone.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
