/**
 * packages/scraper/src/ani.ts — declaratii.integritate.eu
 * For each active politician: search by name, parse results, upsert wealth_declarations,
 * update last_declaration_date + declaration_stopped_after_ccr (CCR efectivă 12 iulie 2025).
 */

import { createServiceClient } from './supabase-env'
import { fetchText } from './fetch-text'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Tevad.ro/1.0 (+https://tevad.ro)'
const BASE = 'https://declaratii.integritate.eu'
const CCR_EFFECTIVE = '2025-07-12'
const DELAY_MS = 1000

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function headers(): Record<string, string> {
  return {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ro-RO,ro;q=0.9',
  }
}

/** Assume DB name is "Prenume NUME" or "Prenume Nume Nume" — family name = last token. */
export function splitNameForSearch(fullName: string): { nume: string; prenume: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { nume: fullName, prenume: '' }
  if (parts.length === 1) return { nume: parts[0], prenume: '' }
  const nume = parts[parts.length - 1]!
  const prenume = parts.slice(0, -1).join(' ')
  return { nume, prenume }
}

export interface ParsedDeclaration {
  pdf_url: string
  year: number
  type: 'avere' | 'interese'
  institution: string | null
  declaration_date: string | null
}

function absolutizePdf(href: string): string | null {
  const h = href.trim()
  if (!h || h === '#') return null
  if (h.startsWith('http')) return h
  if (h.startsWith('//')) return 'https:' + h
  if (h.startsWith('/')) return BASE + h
  return `${BASE}/${h.replace(/^\.\//, '')}`
}

/** Extract declaration rows from integritate search / list HTML. */
export function parseIntegritateHtml(html: string): ParsedDeclaration[] {
  const out: ParsedDeclaration[] = []
  const seen = new Set<string>()

  const pdfHref =
    /href=["']([^"']+\.pdf[^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = pdfHref.exec(html)) !== null) {
    const raw = m[1]
    const pdf_url = absolutizePdf(raw)
    if (!pdf_url || seen.has(pdf_url)) continue
    seen.add(pdf_url)

    const start = Math.max(0, m.index - 400)
    const slice = html.slice(start, m.index + 80)
    const yearMatch = slice.match(/\b(20[0-2]\d)\b/g)
    const year = yearMatch?.length ? Math.max(...yearMatch.map(Number)) : new Date().getFullYear()

    const low = slice.toLowerCase()
    const type: 'avere' | 'interese' =
      low.includes('interes') || pdf_url.toLowerCase().includes('interes') ? 'interese' : 'avere'

    let institution: string | null = null
    const inst = slice.match(/(?:Camera\s+Deputa|Senat|Guvern|Primarie|Institutie)[^<]{0,120}/i)
    if (inst) institution = inst[0].replace(/\s+/g, ' ').trim().slice(0, 200)

    let declaration_date: string | null = null
    const dm = slice.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/)
    if (dm) {
      const dd = dm[1]!.padStart(2, '0')
      const mm = dm[2]!.padStart(2, '0')
      const yy = dm[3]!
      declaration_date = `${yy}-${mm}-${dd}`
    }

    out.push({ pdf_url, year, type, institution, declaration_date })
  }

  return out
}

function buildSearchUrl(nume: string, prenume: string): string {
  const q = new URLSearchParams()
  if (nume) q.set('nume', nume)
  if (prenume) q.set('prenume', prenume)
  return `${BASE}/cautare?${q.toString()}`
}

async function fetchDeclarationsForPolitician(name: string): Promise<ParsedDeclaration[]> {
  const { nume, prenume } = splitNameForSearch(name)
  const urls = [buildSearchUrl(nume, prenume)]
  if (prenume) urls.push(buildSearchUrl(prenume, nume))

  const merged: ParsedDeclaration[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    try {
      const html = await fetchText(url, headers())
      for (const d of parseIntegritateHtml(html)) {
        if (seen.has(d.pdf_url)) continue
        seen.add(d.pdf_url)
        merged.push(d)
      }
    } catch {
      /* try next URL order */
    }
  }
  return merged
}

export async function run(): Promise<{ politicians: number; rows: number; errors: number }> {
  const supabase = createServiceClient()
  console.log('[ani] declaratii.integritate.eu — per-politician search (1s delay)')

  const { data: pols, error: polErr } = await supabase
    .from('politicians')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')
    .limit(2000)

  if (polErr) throw polErr
  const list = pols ?? []
  let rows = 0
  let errors = 0

  for (let i = 0; i < list.length; i++) {
    const p = list[i]!
    await sleep(DELAY_MS)
    try {
      const decls = await fetchDeclarationsForPolitician(p.name)
      if (decls.length === 0) {
        console.log(`[ani] No match found for: ${p.name}`)
        continue
      }

      const payload = decls.map(d => ({
        politician_id: p.id,
        year: d.year,
        type: d.type,
        pdf_url: d.pdf_url,
        institution: d.institution,
        declaration_date: d.declaration_date,
      }))
      const { error: insErr } = await supabase.from('wealth_declarations').upsert(payload, {
        onConflict: 'politician_id,pdf_url',
      })
      if (insErr) {
        console.warn(`[ani] upsert declarations ${p.name}:`, insErr.message)
        errors++
      } else {
        rows += decls.length
      }

      const { data: top } = await supabase
        .from('wealth_declarations')
        .select('declaration_date')
        .eq('politician_id', p.id)
        .not('declaration_date', 'is', null)
        .order('declaration_date', { ascending: false })
        .limit(1)

      const last = top?.[0]?.declaration_date ?? null
      const years = Array.from(new Set(decls.map(d => d.year))).sort((a, b) => a - b)
      const stopped = last != null && String(last) < CCR_EFFECTIVE

      const { error: upErr } = await supabase
        .from('politicians')
        .update({
          last_declaration_date: last,
          declaration_stopped_after_ccr: stopped,
        })
        .eq('id', p.id)

      if (upErr) console.warn(`[ani] update politician ${p.name}:`, upErr.message)

      const yStr = years.join(', ')
      console.log(`[ani] ${p.name} → ${decls.length} declarations found (${yStr}) ✓`)
    } catch (e) {
      errors++
      console.error(`[ani] ${p.name}:`, (e as Error).message)
    }
  }

  console.log(`[ani] Done. ${list.length} politicians, ${rows} declaration rows upserted, ${errors} errors.`)
  return { politicians: list.length, rows, errors }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('ani.ts')) {
  run().catch(e => {
    console.error('[ani] Fatal:', e)
    process.exit(1)
  })
}
