import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const p = path.join(__dirname, '..', 'data', 'bec-list-source.txt')
const t = fs.readFileSync(p, 'utf8')
const STD = new Set(['PSD', 'PNL', 'USR', 'AUR', 'UDMR', 'SOS', 'POT', 'PMP', 'PRO'])
const dep = {}
const sen = {}
let nd = 0,
  ns = 0

for (const line of t.split(/\n/)) {
  const tr = line.trim()
  let rest = null
  let bucket = null
  if (tr.includes('deputați:')) {
    rest = tr.split('deputați:')[1].trim()
    bucket = dep
  } else if (tr.startsWith('senatori:')) {
    rest = tr.slice('senatori:'.length).trim()
    bucket = sen
  }
  if (!rest) continue
  const parts = rest.split(',').map(x => x.trim().replace(/;$/, '')).filter(Boolean)
  for (const part of parts) {
    const open = part.lastIndexOf(' (')
    if (open < 0) continue
    const name = part.slice(0, open).trim()
    const party = part.slice(open + 2, -1).trim()
    const ps = STD.has(party.toUpperCase()) && party.length <= 6 ? party.toUpperCase() : 'MIN'
    bucket[ps] = (bucket[ps] || 0) + 1
    if (bucket === dep) nd++
    else ns++
  }
}
console.log({ dep, sen, nd, ns, total: nd + ns })
