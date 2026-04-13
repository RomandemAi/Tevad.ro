/**
 * packages/scraper/src/gov.ts — Guvernul României (cabinet)
 * Pagina listă: https://www.gov.ro/ro/guvernul/cabinetul-de-ministri
 */

import { createServiceClient } from './supabase-env'
import { slugify } from './slugify'
import { nameIdentitySignature } from './name-identity'
import { partyColors } from './party-colors'
import { fetchText } from './fetch-text'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tevad.ro/1.0'
const CABINET_URLS = [
  'https://www.gov.ro/ro/guvernul/cabinetul-de-ministri',
  'https://gov.ro/ro/guvernul/cabinetul-de-ministri',
  'https://www.gov.ro/ro/guvern',
  'https://gov.ro/ro/guvern',
]
const MANDATE_START = '2024-12-01'

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export interface CabinetMember {
  name: string
  role: string
  partyShort: string
  chamber: 'premier' | 'ministru'
  mandateStart: string
  /** gov.ro cabinet portrait (https://gov.ro/fisiere/ministri/…) */
  photoUrl: string | null
}

function absolutizeUrl(src: string): string {
  const s = src.trim()
  if (s.startsWith('https://') || s.startsWith('http://')) return s
  if (s.startsWith('//')) return `https:${s}`
  if (s.startsWith('/')) return `https://gov.ro${s}`
  return `https://gov.ro/${s}`
}

function extractImgUrl(blockInner: string): string | null {
  const im = blockInner.match(/<img[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/i)
  if (!im?.[1]) return null
  return absolutizeUrl(im[1])
}

/**
 * Parse current gov.ro cabinet markup (PM block uses .ministrii.w100p + .pageImage;
 * ministers use .ministriiBox + .ministriimage).
 */
export function parseCabinetHtml(html: string): CabinetMember[] {
  const members: CabinetMember[] = []
  const seen = new Set<string>()

  const blockRe =
    /<div class="(ministriiBox[^"]*|ministrii w100p[^"]*)"[^>]*>([\s\S]*?)<div class="ministriiDescriere"[^>]*>\s*<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h3>\s*<p>([^<]+)<\/p>/gi

  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const blockInner = m[2] ?? ''
    const name = (m[3] ?? '').replace(/\s+/g, ' ').trim()
    const roleRaw = (m[4] ?? '').replace(/\s+/g, ' ').trim()
    if (name.length < 4) continue

    const rl = roleRaw.toLowerCase()
    if (!/(prim-ministru|viceprim|ministrul|ministru)/i.test(rl)) continue

    const sig = nameIdentitySignature(name)
    if (seen.has(sig)) continue

    const isPm = rl.includes('prim-ministru') && !rl.includes('viceprim')
    const chamber: 'premier' | 'ministru' = isPm ? 'premier' : 'ministru'

    const partyMatch = blockInner.match(/\(([A-Z]{2,6})\)/)
    const partyShort = partyMatch?.[1] ?? 'IND'

    const photoUrl = extractImgUrl(blockInner)

    seen.add(sig)
    members.push({
      name,
      role: roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1),
      partyShort,
      chamber,
      mandateStart: MANDATE_START,
      photoUrl,
    })
  }

  return members
}

/** Apply gov.ro cabinet portraits to every active row whose display name matches a cabinet member (order-agnostic). */
async function applyCabinetPhotosToList(
  supabase: ReturnType<typeof createServiceClient>,
  cabinet: CabinetMember[]
): Promise<void> {
  const photoBySig = new Map<string, string>()
  for (const mem of cabinet) {
    if (mem.photoUrl) photoBySig.set(nameIdentitySignature(mem.name), mem.photoUrl)
  }
  if (photoBySig.size === 0) return

  const { data: rows, error } = await supabase.from('politicians').select('id, name').eq('is_active', true)
  if (error) {
    console.warn('[gov] photo batch:', error.message)
    return
  }
  let n = 0
  for (const row of rows ?? []) {
    const url = photoBySig.get(nameIdentitySignature(row.name))
    if (!url) continue
    const { error: uErr } = await supabase.from('politicians').update({ avatar_url: url }).eq('id', row.id)
    if (uErr) console.warn(`[gov] photo ${row.id}:`, uErr.message)
    else n++
  }
  console.log(`[gov] Cabinet photos applied to ${n} politician row(s).`)
}

/** Current cabinet from gov.ro HTML — same members as `run()` upserts, no DB writes. */
export async function fetchCabinetRoster(): Promise<CabinetMember[]> {
  let html = ''
  let lastErr: Error | null = null
  for (const url of CABINET_URLS) {
    try {
      console.log('[gov] Fetching…', url)
      html = await fetchText(url, {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9',
      })
      const trial = parseCabinetHtml(html)
      if (trial.length >= 3) {
        console.log(`[gov] Using cabinet parser (${trial.length} members) from`, url)
        break
      }
      console.warn('[gov] Page parsed 0–2 cabinet rows, trying next URL…')
      html = ''
    } catch (e) {
      lastErr = e as Error
      console.warn('[gov] URL failed:', (e as Error).message)
    }
  }
  if (!html) throw lastErr ?? new Error('gov.ro: no cabinet HTML')
  return parseCabinetHtml(html)
}

export async function run(): Promise<{ synced: number; errors: number }> {
  const supabase = createServiceClient()
  const list = await fetchCabinetRoster()
  console.log(`[gov] Parsed ${list.length} cabinet rows`)
  let ok = 0
  let errors = 0
  for (let i = 0; i < list.length; i++) {
    const mem = list[i]!
    await sleep(200)
    const slug = `${slugify(mem.name)}-${mem.chamber}`.slice(0, 120)
    const colors = partyColors(mem.partyShort)
    const { error } = await supabase.from('politicians').upsert(
      {
        slug,
        name: mem.name,
        role: mem.role,
        party: mem.partyShort,
        party_short: mem.partyShort,
        chamber: mem.chamber,
        mandate_start: MANDATE_START,
        is_active: true,
        avatar_color: colors.bg,
        avatar_text_color: colors.text,
        avatar_url: mem.photoUrl,
      },
      { onConflict: 'slug' }
    )
    if (error) {
      console.error(`[gov] ${mem.name}:`, error.message)
      errors++
    } else {
      ok++
      console.log(`[gov] ✓ ${mem.name} (${mem.chamber})${mem.photoUrl ? ' +photo' : ''}`)
    }
  }

  await applyCabinetPhotosToList(supabase, list)

  console.log(`[gov] Done. ${ok} ok, ${errors} errors.`)
  return { synced: ok, errors }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('gov.ts')) {
  run().catch(e => {
    console.error('[gov] Fatal:', e)
    process.exit(1)
  })
}
