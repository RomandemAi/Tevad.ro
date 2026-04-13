/**
 * Compare data.gov/OpenPolitics deputy roster to names in bec-list-source (rough).
 * Run: npx tsx scripts/find-missing-deputy.mts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchDeputyRoster } from '../src/cdep.ts'
import { nameIdentitySignature } from '../src/name-identity.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'bec-list-source.txt'), 'utf8')
const ours = new Set<string>()
for (const line of src.split(/\n/)) {
  const tr = line.trim()
  let rest: string | null = null
  if (tr.includes('deputați:')) rest = tr.split('deputați:')[1] ?? ''
  else if (tr.startsWith('senatori:')) continue
  if (!rest) continue
  for (const part of rest.split(',')) {
    const p = part.trim().replace(/;$/, '')
    const open = p.lastIndexOf(' (')
    if (open < 0) continue
    const name = p.slice(0, open).trim()
    if (name) ours.add(nameIdentitySignature(name))
  }
}

const { deputies } = await fetchDeputyRoster()
const missing = deputies.filter(d => !ours.has(nameIdentitySignature(d.name)))
console.log('Roster size', deputies.length, 'our sigs', ours.size)
console.log(
  'Missing in our file (first 25):',
  missing.slice(0, 25).map(d => `${d.name} (${d.partyShort}) ${d.constituency}`)
)
