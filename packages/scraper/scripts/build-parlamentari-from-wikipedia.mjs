/**
 * Builds packages/scraper/data/parlamentari-2024-2028.json from ro.wikipedia.org
 * tables (BEC-cited), 331 deputați + 134 senatori = 465.
 *
 * Run: node scripts/build-parlamentari-from-wikipedia.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'data', 'parlamentari-2024-2028.json')

const DEP_PAGE = 'Legislatura 2024-2028 (Camera Deputaților)'
const SEN_PAGE = 'Legislatura 2024-2028 (Senat)'

async function fetchWikitext(title) {
  const u = new URL('https://ro.wikipedia.org/w/api.php')
  u.searchParams.set('action', 'parse')
  u.searchParams.set('page', title)
  u.searchParams.set('prop', 'wikitext')
  u.searchParams.set('format', 'json')
  u.searchParams.set('formatversion', '2')
  const r = await fetch(u)
  if (!r.ok) throw new Error(`Wiki ${r.status}`)
  const j = await r.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  const w = j.parse?.wikitext
  if (!w) throw new Error(`No wikitext for ${title}: ${JSON.stringify(j).slice(0, 200)}`)
  return typeof w === 'string' ? w : w.content ?? w['*']
}

function firstWikiLink(cell) {
  const m = String(cell).match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
  if (!m) return cell.replace(/^\[\[/, '').replace(/\]\]$/, '').trim()
  return (m[2] ?? m[1]).trim()
}

function partyFromCell(cell) {
  const link = firstWikiLink(cell)
  const l = link.toLowerCase()
  if (l.includes('social democrat')) return { partyShort: 'PSD', party: 'PSD' }
  if (l.includes('unirea rom')) return { partyShort: 'AUR', party: 'AUR' }
  if (l.includes('național liberal') || l.includes('national liberal')) return { partyShort: 'PNL', party: 'PNL' }
  if (l.includes('salvați rom') || l.includes('salvati rom')) return { partyShort: 'USR', party: 'USR' }
  if (l.includes('s.o.s') || l.includes('sos rom')) return { partyShort: 'SOS', party: 'SOS' }
  if (l.includes('oamenilor tineri')) return { partyShort: 'POT', party: 'POT' }
  if (l.includes('maghiar') || l.includes('udmr')) return { partyShort: 'UDMR', party: 'UDMR' }
  if (l.includes('minorit')) return { partyShort: 'MIN', party: 'Minorități' }
  return { partyShort: 'MIN', party: link }
}

function countyFromCell(cell) {
  const t = firstWikiLink(cell)
  if (t.includes('Bucure')) return 'București'
  if (t.includes('Diaspora')) return 'Diaspora'
  if (t.toLowerCase() === 'național' || t.toLowerCase() === 'national') return 'Minorități'
  return t
}

/** Split wikitable row into cell strings (newline cells or || … || …). */
function rowToCells(rowBlock) {
  const trimmed = rowBlock.trim().replace(/^\|-\s*/, '')
  if (trimmed.includes('||')) {
    return trimmed
      .split(/\s*\|\|\s*/)
      .map(s => s.replace(/^\|\s*/, '').trim())
      .filter(Boolean)
  }
  return trimmed
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && !l.startsWith('|}'))
    .map(l => l.replace(/^\|\s*/, '').trim())
}

function parseDeputyTable(wt) {
  const start = wt.indexOf('{| class="wikitable sortable"')
  const end = wt.indexOf('\n\n== Partide', start)
  if (start < 0 || end < 0) throw new Error('Deputy table not found')
  const chunk = wt.slice(start, end)
  const rows = chunk.split(/\n\|-\n/)
  const entries = []
  for (const row of rows) {
    if (row.includes('!Număr') || row.includes('! Prenume')) continue
    const cells = rowToCells(row)
    if (cells.length < 4) continue
    const num = parseInt(cells[0].replace(/\D/g, ''), 10)
    if (!Number.isFinite(num)) continue
    const name = firstWikiLink(cells[1])
    const county = countyFromCell(cells[2])
    const { partyShort, party } = partyFromCell(cells[3])
    entries.push({ county, chamber: 'deputat', name, partyShort, party })
  }
  return entries
}

function parseSenateTable(wt) {
  const start = wt.indexOf('{| class="wikitable"')
  const end = wt.indexOf('\n\n== Partide', start)
  if (start < 0 || end < 0) throw new Error('Senate table not found')
  const chunk = wt.slice(start, end)
  const rows = chunk.split(/\n\|-\n/)
  const entries = []
  for (const row of rows) {
    if (row.includes('! Număr') || row.includes('!Număr') || row.includes('! Prenume')) continue
    const cells = rowToCells(row)
    if (cells.length < 5) continue
    const num = parseInt(cells[0].replace(/\D/g, ''), 10)
    if (!Number.isFinite(num)) continue
    const rawNameCell = cells[1]
    const name = firstWikiLink(rawNameCell)
    const county = countyFromCell(cells[2])
    const { partyShort, party } = partyFromCell(cells[4])
    entries.push({ county, chamber: 'senator', name, partyShort, party })
  }
  return entries
}

const depWt = await fetchWikitext(DEP_PAGE)
const senWt = await fetchWikitext(SEN_PAGE)
const dep = parseDeputyTable(depWt)
const sen = parseSenateTable(senWt)

if (dep.length !== 331) {
  console.error(`Expected 331 deputați, got ${dep.length}`)
  process.exit(1)
}
if (sen.length !== 134) {
  console.error(`Expected 134 senatori, got ${sen.length}`)
  process.exit(1)
}

const payload = {
  source:
    'ro.wikipedia.org — Legislatura 2024-2028 (Camera Deputaților) + (Senat), tables cite BEC; regenerate: node scripts/build-parlamentari-from-wikipedia.mjs',
  mandate_start: '2024-12-01',
  entries: [...dep, ...sen],
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
console.log(`Wrote ${outPath} (${payload.entries.length} entries)`)

function tally(list) {
  const m = new Map()
  for (const e of list) m.set(e.partyShort, (m.get(e.partyShort) ?? 0) + 1)
  return Object.fromEntries([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])))
}

console.log('Deputați by party:', tally(dep))
console.log('Senatori by party:', tally(sen))
