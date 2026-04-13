/**
 * packages/scraper/src/senat.ts — Senatul României
 * Primary: https://www.senat.ro/FisaSenatori.aspx (lista include link-uri FisaSenator.aspx?ParlamentarID=…)
 * Fallbacks: PagesBeta list, senat.ro mirror, pagina veche.
 * Detaliu: FisaSenator.aspx?ParlamentarID={uuid} (sau ParlID numeric pe site-uri vechi)
 */

import { createServiceClient } from './supabase-env'
import { slugify } from './slugify'
import { partyColors } from './party-colors'
import { fetchText } from './fetch-text'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tevad.ro/1.0'
const SENAT_BASE = 'https://www.senat.ro'
const MANDATE_START = '2024-12-01'

const LIST_URLS = [
  `${SENAT_BASE}/FisaSenatori.aspx`,
  `${SENAT_BASE}/PagesBeta/Lists/SenatoriBD/AllItems.aspx`,
  `https://senat.ro/FisaSenatori.aspx`,
  `${SENAT_BASE}/ro/pag/senatori.html`,
]

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function senatHeaders() {
  return {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
  }
}

export interface SenatorRow {
  senatId: string
  name: string
  slug: string
  partyShort: string
  constituency: string
  mandateStart: string
}

function extractPartyFromContext(slice: string): string {
  const paren = slice.match(/\(\s*([A-Z]{2,6})\s*\)/)
  if (paren?.[1]) return paren[1]
  const grp = slice.match(/Grupul\s+parlamentar[^<]{0,80}?(?:al\s+)?(?:Partidului\s+)?([A-ZĂÂÎȘȚa-zăâîșț][A-Za-zăâîșțĂÂÎȘȚ\s]{2,50})/i)
  if (grp?.[1]) {
    const g = grp[1].trim()
    const ac = g.match(/\b(PSD|PNL|USR|AUR|UDMR|SOS|POT|PMP|PRO|PACE)\b/i)
    if (ac) return ac[1]!.toUpperCase()
  }
  return 'IND'
}

const UUID_RE = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'

export async function parseSenatorsFromHtml(html: string): Promise<Omit<SenatorRow, 'mandateStart'>[]> {
  const senators: Omit<SenatorRow, 'mandateStart'>[] = []
  const seen = new Set<string>()

  const patterns: RegExp[] = [
    new RegExp(
      `href=['"]FisaSenator\\.aspx\\?ParlamentarID=(${UUID_RE})['"][^>]*>([^<]+)<`,
      'gi'
    ),
    new RegExp(
      `href=['"]([^'"]*FisaSenator\\.aspx\\?[^'"]*ParlamentarID=(${UUID_RE})[^'"]*)['"][^>]*>([^<]+)<`,
      'gi'
    ),
    /href=["']([^"']*?[Ff]isa[Ss]enator\.aspx\?[^"']*[Pp]arl[Ii][Dd]=(\d+)[^"']*)["'][^>]*>([^<]+)<\/a>/gi,
    /FisaSenator\.aspx\?[^"'\s>]*[Pp]arl[Ii][Dd]=(\d+)[^"'\s>]*[^>]*>([^<]+)<\/a>/gi,
  ]

  for (const rowRegex of patterns) {
    rowRegex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = rowRegex.exec(html)) !== null) {
      let senatId: string
      let rawName: string
      const m = match
      if (/^\d+$/.test(m[1] ?? '') && m[2]) {
        senatId = m[1]!
        rawName = m[2]!
      } else if (/^[a-f0-9-]{36}$/i.test(m[2] ?? '') && m[3]) {
        senatId = m[2]!
        rawName = m[3]!
      } else if (/^[a-f0-9-]{36}$/i.test(m[1] ?? '') && m[2]) {
        senatId = m[1]!
        rawName = m[2]!
      } else {
        continue
      }
      rawName = rawName.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
      if (!rawName || rawName.length < 3) continue
      if (seen.has(senatId)) continue
      seen.add(senatId)
      const slice = html.substring(Math.max(0, match.index - 120), match.index + 800)
      const partyShort = extractPartyFromContext(slice)
      const slugBase = slugify(rawName)
      const slug = `${slugBase}-sen-${senatId}`.slice(0, 120)
      senators.push({
        senatId,
        name: rawName,
        slug,
        partyShort,
        constituency: '',
      })
    }
    if (senators.length > 0) break
  }
  return senators
}

async function fetchSenatorList(): Promise<Omit<SenatorRow, 'mandateStart'>[]> {
  let lastErr: Error | null = null
  for (const url of LIST_URLS) {
    try {
      console.log(`[senat] Fetch list: ${url}`)
      const html = await fetchText(url, senatHeaders())
      const list = await parseSenatorsFromHtml(html)
      if (list.length > 0) {
        console.log(`[senat] Found ${list.length} senators`)
        return list
      }
      console.warn(`[senat] 0 matches from ${url}`)
    } catch (e) {
      lastErr = e as Error
      console.warn(`[senat] List failed:`, (e as Error).message)
    }
  }
  throw lastErr ?? new Error('No senator list parsed')
}

function detailUrl(senatId: string): string {
  if (/^\d+$/.test(senatId)) return `${SENAT_BASE}/FisaSenator.aspx?ParlID=${senatId}`
  return `${SENAT_BASE}/FisaSenator.aspx?ParlamentarID=${senatId}`
}

async function fetchSenatorDetail(senatId: string): Promise<{
  mandateStart: string
  constituency: string
  avereHref: string | null
}> {
  const url = detailUrl(senatId)
  try {
    const html = await fetchText(url, senatHeaders())
    const circ = html.match(/Circumscrip[^<:]{0,30}:\s*([^<\n]{2,120})/i)
    let avereHref: string | null = null
    const block = html.match(
      /Declara(?:ție|tie)\s+de\s+avere[\s\S]{0,800}?href=["']([^"']+)["']/i
    )?.[1]
    if (block) avereHref = block.startsWith('http') ? block : `${SENAT_BASE}${block.startsWith('/') ? '' : '/'}${block}`
    if (!avereHref) {
      const integ = html.match(/href=["']([^"']*declaratii\.integritate\.eu[^"']*)["']/i)?.[1]
      if (integ) avereHref = integ.startsWith('http') ? integ : `https:${integ}`
    }
    return { mandateStart: MANDATE_START, constituency: circ?.[1]?.trim() ?? '', avereHref }
  } catch {
    return { mandateStart: MANDATE_START, constituency: '', avereHref: null }
  }
}

async function upsertSenator(row: SenatorRow, supabase: ReturnType<typeof createServiceClient>): Promise<'ok' | 'err'> {
  const colors = partyColors(row.partyShort)
  const { error } = await supabase.from('politicians').upsert(
    {
      slug: row.slug,
      name: row.name,
      role: 'Senator',
      party: row.partyShort,
      party_short: row.partyShort,
      chamber: 'senator',
      constituency: row.constituency || null,
      mandate_start: MANDATE_START,
      is_active: true,
      senat_id: row.senatId,
      avatar_color: colors.bg,
      avatar_text_color: colors.text,
    },
    { onConflict: 'slug' }
  )
  if (error) {
    console.error(`[senat] Upsert ${row.name}:`, error.message)
    return 'err'
  }
  return 'ok'
}

export async function run(): Promise<{ synced: number; errors: number }> {
  const supabase = createServiceClient()
  console.log('[senat] Starting Senat scrape...')
  const baseList = await fetchSenatorList()
  const total = baseList.length
  const pad = Math.max(3, String(total).length)
  let ok = 0
  let errors = 0

  for (let i = 0; i < baseList.length; i++) {
    const base = baseList[i]!
    const idx = String(i + 1).padStart(pad, '0')
    try {
      if (i > 0) await sleep(500)
      const detail = await fetchSenatorDetail(base.senatId)
      if (detail.avereHref) {
        console.log(`[senat]   declarație avere (Senat): ${detail.avereHref.slice(0, 88)}`)
      }
      const row: SenatorRow = {
        ...base,
        mandateStart: detail.mandateStart,
        constituency: detail.constituency || base.constituency,
      }
      const r = await upsertSenator(row, supabase)
      if (r === 'ok') {
        ok++
        console.log(`[senat] ${idx}/${total} ${base.name} (${base.partyShort}) ✓`)
      } else errors++
    } catch (e) {
      errors++
      console.error(`[senat] ${idx}/${total} ${base.name}:`, (e as Error).message)
    }
  }
  console.log(`[senat] Done. ${total} processed. ${ok} ok, ${errors} errors.`)
  return { synced: ok, errors }
}

async function main() {
  const { synced, errors } = await run()
  if (synced === 0 && errors > 0) process.exit(1)
}

if (process.argv[1]?.replace(/\\/g, '/').includes('senat.ts')) {
  main().catch(e => {
    console.error('[senat] Fatal:', e)
    process.exit(1)
  })
}
