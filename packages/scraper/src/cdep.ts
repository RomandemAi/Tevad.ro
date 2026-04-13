/**
 * packages/scraper/src/cdep.ts — Camera Deputaților (fără cdep.ro)
 * Surse: data.gov.ro (CKAN API) → fallback OpenPolitics CSV (CC-BY-SA).
 */

import { createServiceClient } from './supabase-env'
import { slugify } from './slugify'
import { nameIdentitySignature } from './name-identity'
import { partyColors } from './party-colors'
import { fetchText, fetchJson, fetchBuffer } from './fetch-text'

const UA = 'Tevad.ro Data Pipeline (contact: open@tevad.ro; +https://tevad.ro)'
const CKAN = 'https://data.gov.ro/api/3/action'
const MANDATE_START = '2024-12-01'

const OPEN_POLITICS_CSV = [
  'https://parlament.openpolitics.ro/export/membri_grupuri.csv',
  'https://parlament.openpolitics.ro/export/membri-grupuri.csv',
]

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function jsonHeaders(): Record<string, string> {
  return {
    'User-Agent': UA,
    Accept: 'application/json',
    'Accept-Language': 'ro-RO,ro;q=0.9',
  }
}

interface CkanPackageSearch {
  success?: boolean
  result?: { count?: number; results?: { id?: string; name?: string; title?: string }[] }
}

interface CkanResource {
  id?: string
  url?: string
  format?: string
  name?: string
}

interface CkanPackageShow {
  success?: boolean
  result?: {
    id?: string
    name?: string
    title?: string
    resources?: CkanResource[]
  }
}

export interface DeputyInput {
  name: string
  partyShort: string
  partyFull: string
  constituency: string
  externalId: string | null
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function pickFromRow(row: Record<string, unknown>, candidates: string[]): string {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const cn = normKey(c)
    for (const k of keys) {
      const kn = normKey(k)
      if (kn === cn || kn.includes(cn) || cn.includes(kn)) {
        const s = String(row[k] ?? '').trim()
        if (s) return s
      }
    }
  }
  return ''
}

const NAME_KEYS = [
  'nume si prenume',
  'nume și prenume',
  'nume complet',
  'nume',
  'deputat',
  'persoana',
  'name',
  'full name',
  'denumire',
]
const PARTY_KEYS = ['partid', 'partid politic', 'grup parlamentar', 'grup', 'party', 'formatiune']
const CIRC_KEYS = ['judet', 'județ', 'circumscriptie', 'circumscripție', 'circumscriptie electorala', 'colegiu']
const ID_KEYS = ['id', 'id parlamentar', 'cod', 'nr']

function partyShortFromFull(partyFull: string): string {
  const ac = partyFull.match(/\b(PSD|PNL|USR|AUR|UDMR|SOS|POT|PMP|PRO|UNU|FD|REPER|PACE)\b/i)
  if (ac?.[1]) return ac[1].toUpperCase()
  const l = partyFull.toLowerCase()
  if (l.includes('social democrat')) return 'PSD'
  if (l.includes('national liberal') || partyFull.includes('Naţional Liberal')) return 'PNL'
  if (partyFull.includes('USR')) return 'USR'
  if (partyFull.includes('AUR') || l.includes('unirea rom')) return 'AUR'
  if (partyFull.includes('UDMR') || l.includes('maghiar')) return 'UDMR'
  if (partyFull.length <= 12) return partyFull.toUpperCase()
  return partyFull.slice(0, 6).toUpperCase()
}

function rowToDeputy(obj: Record<string, unknown>): DeputyInput | null {
  const name = pickFromRow(obj, NAME_KEYS)
  if (!name || name.length < 4) return null
  const partyFull = pickFromRow(obj, PARTY_KEYS) || 'IND'
  const partyShort = partyShortFromFull(partyFull)
  const constituency = pickFromRow(obj, CIRC_KEYS)
  const ext = pickFromRow(obj, ID_KEYS)
  const externalId = ext && /^\d+$/.test(ext) ? ext : null
  return {
    name: name.replace(/\s+/g, ' ').trim(),
    partyShort: partyShort || 'IND',
    partyFull: partyFull || partyShort || 'IND',
    constituency,
    externalId,
  }
}

function mergeDeputyInputs(a: DeputyInput, b: DeputyInput): DeputyInput {
  const pickId = (x: string | null, y: string | null) => (x ? x : y ? y : null)
  const preferName = (x: string, y: string) =>
    x.length !== y.length ? (x.length > y.length ? x : y) : x.localeCompare(y, 'ro') <= 0 ? x : y
  return {
    name: preferName(a.name, b.name),
    partyShort: a.partyShort || b.partyShort,
    partyFull: a.partyFull || b.partyFull,
    constituency: a.constituency || b.constituency,
    externalId: pickId(a.externalId, b.externalId),
  }
}

function dedupeDeputiesByNameIdentity(deputies: DeputyInput[]): DeputyInput[] {
  const m = new Map<string, DeputyInput>()
  for (const d of deputies) {
    const sig = nameIdentitySignature(d.name)
    const prev = m.get(sig)
    m.set(sig, prev ? mergeDeputyInputs(prev, d) : d)
  }
  return Array.from(m.values())
}

/** Minimal CSV parser (RFC4180-ish). */
export function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && (c === '\n' || (c === '\r' && text[i + 1] === '\n'))) {
      if (c === '\r') i++
      lines.push(cur)
      cur = ''
      continue
    }
    if (!inQuotes && c === '\r') {
      lines.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  if (cur.length) lines.push(cur)
  const rows = lines.map(l => {
    const cells: string[] = []
    let cell = ''
    let q = false
    for (let j = 0; j < l.length; j++) {
      const ch = l[j]
      if (ch === '"') {
        q = !q
        continue
      }
      if (!q && ch === ',') {
        cells.push(cell.trim())
        cell = ''
        continue
      }
      cell += ch
    }
    cells.push(cell.trim())
    return cells
  })
  if (rows.length < 2) return []
  const header = rows[0].map(h => h.replace(/^\ufeff/, '').trim())
  const out: Record<string, string>[] = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (!cells.some(Boolean)) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) obj[header[c] || `col_${c}`] = cells[c] ?? ''
    out.push(obj)
  }
  return out
}

function scoreResource(r: CkanResource): number {
  const fmt = (r.format ?? '').toUpperCase()
  if (fmt === 'JSON') return 30
  if (fmt === 'CSV') return 25
  if (fmt === 'XLS' || fmt === 'XLSX') return 15
  const u = (r.url ?? '').toLowerCase()
  if (u.endsWith('.json')) return 28
  if (u.endsWith('.csv')) return 24
  if (u.endsWith('.xlsx') || u.endsWith('.xls')) return 14
  return 0
}

async function ckanSearch(q: string, rows: number): Promise<{ name: string; title?: string }[]> {
  const url = `${CKAN}/package_search?q=${encodeURIComponent(q)}&rows=${rows}`
  const json = await fetchJson<CkanPackageSearch>(url, jsonHeaders())
  if (!json.success || !json.result?.results) return []
  return json.result.results.map(p => ({ name: p.name ?? '', title: p.title })).filter(p => p.name)
}

async function ckanPackageShow(id: string): Promise<CkanPackageShow['result'] | null> {
  const url = `${CKAN}/package_show?id=${encodeURIComponent(id)}`
  const json = await fetchJson<CkanPackageShow>(url, jsonHeaders())
  if (!json.success || !json.result) return null
  return json.result
}

function recordsFromJsonPayload(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(x => x && typeof x === 'object') as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const k of ['data', 'records', 'results', 'items', 'features']) {
      const v = o[k]
      if (Array.isArray(v)) return v.filter(x => x && typeof x === 'object') as Record<string, unknown>[]
    }
  }
  return []
}

async function tryParseResource(url: string, format: string): Promise<DeputyInput[]> {
  const fmt = format.toUpperCase()
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: '*/*',
  }
  if (fmt.includes('JSON') || url.toLowerCase().endsWith('.json')) {
    const raw = await fetchText(url, headers)
    const parsed = JSON.parse(raw) as unknown
    const rows = recordsFromJsonPayload(parsed)
    const out: DeputyInput[] = []
    for (const row of rows) {
      const d = rowToDeputy(row)
      if (d) out.push(d)
    }
    return out
  }
  if (fmt.includes('CSV') || url.toLowerCase().endsWith('.csv')) {
    const raw = await fetchText(url, { ...headers, Accept: 'text/csv,text/plain,*/*' })
    const parsed = parseCSV(raw)
    const out: DeputyInput[] = []
    for (const row of parsed) {
      const d = rowToDeputy(row as unknown as Record<string, unknown>)
      if (d) out.push(d)
    }
    return out
  }
  if (fmt.includes('XLS') || url.toLowerCase().includes('.xls')) {
    const buf = await fetchBuffer(url, headers)
    const asText = buf.toString('utf-8', 0, Math.min(buf.length, 500))
    if (asText.includes(',') && asText.split('\n').length > 2) {
      const raw = buf.toString('utf-8')
      const parsed = parseCSV(raw)
      const out: DeputyInput[] = []
      for (const row of parsed) {
        const d = rowToDeputy(row as unknown as Record<string, unknown>)
        if (d) out.push(d)
      }
      return out
    }
    console.warn('[cdep] Skip binary XLS without parser:', url)
  }
  return []
}

async function loadFromDataGov(): Promise<DeputyInput[]> {
  const seenPkg = new Set<string>()
  const packages: { name: string; title?: string }[] = []
  for (const q of ['deputati parlamentari', 'camera deputatilor', 'deputati camera', 'parlament deputati']) {
    try {
      const part = await ckanSearch(q, 50)
      for (const p of part) {
        if (!seenPkg.has(p.name)) {
          seenPkg.add(p.name)
          packages.push(p)
        }
      }
      await sleep(400)
    } catch (e) {
      console.warn(`[cdep] package_search "${q}":`, (e as Error).message)
    }
  }

  const deputies: DeputyInput[] = []
  const seen = new Set<string>()

  for (const pkg of packages) {
    let detail: Awaited<ReturnType<typeof ckanPackageShow>> = null
    try {
      detail = await ckanPackageShow(pkg.name)
      await sleep(400)
    } catch (e) {
      console.warn(`[cdep] package_show ${pkg.name}:`, (e as Error).message)
      continue
    }
    if (!detail?.resources?.length) continue

    const resources = [...detail.resources].sort((a, b) => scoreResource(b) - scoreResource(a))
    for (const res of resources) {
      const fmt = (res.format ?? '').toUpperCase()
      const url = res.url
      if (!url || scoreResource(res) === 0) continue
      if (!/CSV|JSON|XLS/i.test(fmt) && !/\.(csv|json|xlsx|xls)(\?|$)/i.test(url)) continue
      try {
        console.log(`[cdep] Try resource (${fmt}):`, url.slice(0, 100))
        const rows = await tryParseResource(url, fmt)
        await sleep(500)
        for (const d of rows) {
          const key = nameIdentitySignature(d.name)
          if (seen.has(key)) continue
          seen.add(key)
          deputies.push(d)
        }
        if (deputies.length >= 280) {
          console.log(`[cdep] data.gov.ro: collected ${deputies.length} deputy rows (cap)`)
          return deputies
        }
      } catch (e) {
        console.warn('[cdep] Resource failed:', url.slice(0, 80), (e as Error).message)
      }
    }
  }
  return deputies
}

async function loadFromOpenPolitics(): Promise<DeputyInput[]> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'text/csv,text/plain,*/*',
  }
  for (const url of OPEN_POLITICS_CSV) {
    try {
      console.log('[cdep] OpenPolitics CSV:', url)
      const raw = await fetchText(url, headers)
      const parsed = parseCSV(raw)
      const out: DeputyInput[] = []
      const seen = new Set<string>()
      for (const row of parsed) {
        const d = rowToDeputy(row as unknown as Record<string, unknown>)
        if (!d) continue
        const k = nameIdentitySignature(d.name)
        if (seen.has(k)) continue
        seen.add(k)
        out.push(d)
      }
      if (out.length) {
        console.log(`[cdep] OpenPolitics: ${out.length} rows`)
        return out
      }
    } catch (e) {
      console.warn('[cdep] OpenPolitics failed:', url, (e as Error).message)
    }
  }
  return []
}

function makeSlug(name: string, used: Set<string>): string {
  let s = slugify(name) || 'deputat'
  if (!used.has(s)) {
    used.add(s)
    return s.slice(0, 120)
  }
  let n = 2
  while (used.has(`${s}-${n}`)) n++
  const u = `${s}-${n}`
  used.add(u)
  return u.slice(0, 120)
}

export type DeputyRosterResult = { deputies: DeputyInput[]; source: string }

/**
 * Current deputy roster from data.gov.ro (CKAN) with OpenPolitics fallback — same list as `run()` upserts, no DB writes.
 */
export async function fetchDeputyRoster(): Promise<DeputyRosterResult> {
  let list = await loadFromDataGov()
  let source = 'data.gov.ro'
  if (list.length < 80) {
    console.warn(`[cdep] data.gov.ro yielded only ${list.length} rows — merging OpenPolitics fallback`)
    const extra = await loadFromOpenPolitics()
    const seen = new Set(list.map(d => nameIdentitySignature(d.name)))
    for (const e of extra) {
      const ks = nameIdentitySignature(e.name)
      if (!seen.has(ks)) {
        seen.add(ks)
        list.push(e)
      }
    }
    source = 'data.gov.ro+openpolitics'
  }
  if (list.length === 0) {
    list = await loadFromOpenPolitics()
    source = 'openpolitics'
  }
  const deputies = dedupeDeputiesByNameIdentity(list)
  return { deputies, source }
}

export async function run(): Promise<{ synced: number; errors: number; source: string }> {
  const supabase = createServiceClient()
  console.log('[cdep] Camera Deputaților — data.gov.ro + OpenPolitics (no cdep.ro)')

  const { deputies: list, source } = await fetchDeputyRoster()

  const usedSlugs = new Set<string>()
  let ok = 0
  let errors = 0
  const total = list.length
  const pad = String(total).length

  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    const idx = String(i + 1).padStart(pad, '0')
    const slug = makeSlug(d.name, usedSlugs)
    const colors = partyColors(d.partyShort)
    try {
      if (i > 0) await sleep(120)
      const { error } = await supabase.from('politicians').upsert(
        {
          slug,
          name: d.name,
          role: 'Deputat',
          party: d.partyFull,
          party_short: d.partyShort,
          chamber: 'deputat',
          constituency: d.constituency || null,
          mandate_start: MANDATE_START,
          is_active: true,
          cdep_id: d.externalId,
          avatar_color: colors.bg,
          avatar_text_color: colors.text,
        },
        { onConflict: 'slug' }
      )
      if (error) {
        console.error(`[cdep] ${idx}/${total} ${d.name}:`, error.message)
        errors++
      } else {
        ok++
        console.log(`[cdep] ${idx}/${total} ${d.name} (${d.partyShort}) ✓`)
      }
    } catch (e) {
      errors++
      console.error(`[cdep] ${idx}/${total} ${d.name}:`, (e as Error).message)
    }
  }

  console.log(`[cdep] Done (${source}). ${ok} ok, ${errors} errors.`)
  return { synced: ok, errors, source }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('cdep.ts')) {
  run()
    .then(() => process.exit(0))
    .catch(e => {
      console.error('[cdep] Fatal:', e)
      process.exit(1)
    })
}
