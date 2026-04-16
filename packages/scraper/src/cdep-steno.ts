/**
 * packages/scraper/src/cdep-steno.ts
 * CDEP Camera Deputaților — căutare în stenograme (stenogramă oficială).
 *
 * Netlify cron should call a small batch per tick (see `runCdepStenoBatch`).
 * Search entrypoint: `steno2015.cautare` (GET) with `sir`, `dat1`, `dat2`, `leg`, `idl`, `pag`, etc.
 *
 * Docs / public examples often use `www.cdep.ro`; some links omit `www` — we normalize to `https://www.cdep.ro`.
 */

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchText } from './fetch-text'

const CDEP_ORIGIN = 'https://www.cdep.ro'
const CAUTARE_PATH = '/pls/steno/steno2015.cautare'
const CAUTA_FALLBACK_PATH = '/pls/steno/steno2015.cauta'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tevad.ro/1.0'

export interface CdepStenoBatchOptions {
  supabase: SupabaseClient<any, 'public', any>
  /** Console / structured log */
  log?: (msg: string) => void
  limitPoliticians?: number
  maxQueueInserts?: number
  maxTranscriptFetches?: number
  /** Rolling window end = “today” Europe/Bucharest; start = end - windowDays */
  windowDays?: number
  /** Legislative session year label used by CDEP (default current mandate) */
  leg?: string
  /** 1 = Romanian UI copy on cdep */
  idl?: string
}

export interface CdepStenoBatchResult {
  ok: boolean
  politiciansProcessed: number
  transcriptsFetched: number
  queued: number
  skippedSeen: number
  nextPoliticianIndex: number
  errors: string[]
  cautareUrlSample?: string
}

function stripDiacritics(input: string): string {
  return input
    .replace(/\u015F/g, '\u0219')
    .replace(/\u0163/g, '\u021B')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeText(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function roDdMmYyyy(d: Date): string {
  const iso = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Bucharest' })
  const [y, m, da] = iso.split('-')
  if (!y || !m || !da) return ''
  return `${da}-${m}-${y}`
}

function daysAgoBucharest(days: number): Date {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = Number(parts.find(p => p.type === 'year')?.value)
  const mo = Number(parts.find(p => p.type === 'month')?.value)
  const da = Number(parts.find(p => p.type === 'day')?.value)
  const utcGuess = Date.UTC(y, mo - 1, da)
  return new Date(utcGuess - days * 86_400_000)
}

function buildCautareUrl(opts: {
  sir: string
  dat1: string
  dat2: string
  leg: string
  idl: string
  pag: number
}): string {
  const u = new URL(CAUTARE_PATH, CDEP_ORIGIN)
  u.searchParams.set('cam', '')
  u.searchParams.set('com', '0')
  u.searchParams.set('leg', opts.leg)
  for (let i = 1; i <= 5; i++) u.searchParams.set(`topic${i}`, '0')
  u.searchParams.set('nrp', '')
  u.searchParams.set('anp', '')
  u.searchParams.set('idv', '')
  u.searchParams.set('sir', opts.sir)
  u.searchParams.set('sep', 'and')
  u.searchParams.set('ts', '0')
  u.searchParams.set('dat1', opts.dat1)
  u.searchParams.set('dat2', opts.dat2)
  u.searchParams.set('ord', '0')
  u.searchParams.set('pag', String(opts.pag))
  u.searchParams.set('idl', opts.idl)
  return u.toString()
}

function buildCautaFallbackUrl(opts: {
  sir: string
  dat1: string
  dat2: string
  leg: string
  idl: string
}): string {
  const u = new URL(CAUTA_FALLBACK_PATH, CDEP_ORIGIN)
  u.searchParams.set('leg', opts.leg)
  u.searchParams.set('idl', opts.idl)
  u.searchParams.set('sir', opts.sir)
  u.searchParams.set('dat1', opts.dat1)
  u.searchParams.set('dat2', opts.dat2)
  u.searchParams.set('sep', 'and')
  return u.toString()
}

function absolutizeCdep(href: string): string {
  const s = href.trim().replace(/&amp;/g, '&')
  if (s.startsWith('https://') || s.startsWith('http://')) {
    try {
      const u = new URL(s)
      if (u.hostname === 'cdep.ro') {
        u.hostname = 'www.cdep.ro'
        return u.toString()
      }
      return u.toString()
    } catch {
      return s
    }
  }
  if (s.startsWith('/')) return `${CDEP_ORIGIN}${s}`
  return `${CDEP_ORIGIN}/${s}`
}

/** Extract stenogram detail URLs from search results HTML. */
export function extractStenogramLinks(html: string): string[] {
  const out: string[] = []
  const re = /href\s*=\s*["']([^"']*\/pls\/steno\/steno2015\.stenograma\?[^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]
    if (!raw) continue
    const abs = absolutizeCdep(raw)
    if (!out.includes(abs)) out.push(abs)
  }
  return out
}

function stripTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerptAround(plain: string, needleNorm: string, radius = 320): string | null {
  const p = normalizeText(plain)
  const idx = p.indexOf(needleNorm)
  if (idx < 0) return null
  const start = Math.max(0, idx - radius)
  const end = Math.min(p.length, idx + needleNorm.length + radius)
  const ex = p.slice(start, end).trim()
  return ex || null
}

function hashFragment(parts: string[]): string {
  return createHash('sha256').update(parts.join('|'), 'utf8').digest('hex').slice(0, 28)
}

function classifyRecordType(excerptNorm: string): 'promise' | 'statement' {
  const t = excerptNorm
  const future =
    /\bvom\b/.test(t) ||
    /\bvoi\b/.test(t) ||
    /\bvom\s+/.test(t) ||
    /\bo sa\b/.test(t) ||
    /\bos\s+a\b/.test(t) ||
    /\bne angajam\b/.test(t) ||
    /\bne\s+angajam\b/.test(t) ||
    /\bvom\s+introduce\b/.test(t) ||
    /\bvom\s+adopta\b/.test(t) ||
    /\bpromit\b/.test(t) ||
    /\bpromitem\b/.test(t) ||
    /\bgarantam\b/.test(t) ||
    /\bva\s+fi\b.*\b(realizat|implementat|adoptat|lansat)\b/.test(t)
  return future ? 'promise' : 'statement'
}

function confidenceForMatch(fullNorm: string, excerptNorm: string): number {
  if (excerptNorm.includes(fullNorm)) return 92
  const parts = fullNorm.split(' ').filter(Boolean)
  const last = parts[parts.length - 1]
  if (last && last.length >= 4 && excerptNorm.includes(last)) return 78
  return 0
}

async function urlSeen(supabase: SupabaseClient<any, 'public', any>, url: string): Promise<boolean> {
  const { data: src } = await supabase.from('sources').select('id').eq('url', url).maybeSingle()
  if (src) return true
  const { data: q } = await supabase.from('verification_queue').select('id').eq('article_url', url).maybeSingle()
  return !!q
}

async function queueSteno(
  supabase: SupabaseClient<any, 'public', any>,
  row: {
    politicianId: string
    articleUrl: string
    title: string
    recordType: 'promise' | 'statement'
    excerpt: string
    confidence: number
    pubDateIso: string | null
  }
): Promise<'queued' | 'dup' | 'err'> {
  const { error } = await supabase.from('verification_queue').insert({
    politician_id: row.politicianId,
    article_url: row.articleUrl,
    article_title: row.title,
    outlet: 'Camera Deputaților',
    tier: 0,
    record_type: row.recordType,
    topic: 'parliament',
    extracted_quote: row.excerpt,
    confidence: row.confidence,
    pub_date: row.pubDateIso,
  })
  if (error) {
    if (error.code === '23505') return 'dup'
    throw new Error(error.message)
  }
  return 'queued'
}

async function getState(supabase: SupabaseClient<any, 'public', any>, key: string): Promise<string | null> {
  const { data } = await supabase.from('cron_state').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

async function setState(supabase: SupabaseClient<any, 'public', any>, key: string, value: string): Promise<void> {
  await supabase.from('cron_state').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  })
}

export async function runCdepStenoBatch(opts: CdepStenoBatchOptions): Promise<CdepStenoBatchResult> {
  const log = opts.log ?? (() => {})
  const limitPoliticians = Math.min(20, Math.max(1, opts.limitPoliticians ?? 3))
  const maxQueueInserts = Math.min(40, Math.max(1, opts.maxQueueInserts ?? 8))
  const maxTranscriptFetches = Math.min(30, Math.max(1, opts.maxTranscriptFetches ?? 5))
  const windowDays = Math.min(120, Math.max(1, opts.windowDays ?? 14))
  const leg = opts.leg ?? process.env.CDEP_STENO_LEG ?? '2024'
  const idl = opts.idl ?? process.env.CDEP_STENO_IDL ?? '1'

  const errors: string[] = []
  let transcriptsFetched = 0
  let queued = 0
  let skippedSeen = 0
  let politiciansProcessed = 0

  const dat2 = roDdMmYyyy(new Date())
  const dat1 = roDdMmYyyy(daysAgoBucharest(windowDays))
  if (!dat1 || !dat2) {
    return {
      ok: false,
      politiciansProcessed: 0,
      transcriptsFetched: 0,
      queued: 0,
      skippedSeen: 0,
      nextPoliticianIndex: 0,
      errors: ['Could not format dat1/dat2 (Europe/Bucharest).'],
    }
  }

  const { data: polRows, error: polErr } = await opts.supabase
    .from('politicians')
    .select('id,name')
    .eq('is_active', true)
    .order('id', { ascending: true })

  if (polErr || !polRows?.length) {
    return {
      ok: false,
      politiciansProcessed: 0,
      transcriptsFetched: 0,
      queued: 0,
      skippedSeen: 0,
      nextPoliticianIndex: 0,
      errors: [polErr?.message || 'No politicians'],
    }
  }

  const startIdxRaw = await getState(opts.supabase, 'cdep_steno:politician_index')
  const startIdx = Math.abs(Number(startIdxRaw ?? '0') || 0) % polRows.length

  const slice: { id: string; name: string }[] = []
  for (let i = 0; i < limitPoliticians; i++) {
    slice.push(polRows[(startIdx + i) % polRows.length]! as { id: string; name: string })
  }

  let fetchesBudget = maxTranscriptFetches
  let cautareUrlSample: string | undefined

  for (const pol of slice) {
    if (queued >= maxQueueInserts || fetchesBudget <= 0) break
    politiciansProcessed++
    const fullNorm = normalizeText(pol.name)
    const sir = pol.name.trim()

    const cautareUrl = buildCautareUrl({ sir, dat1, dat2, leg, idl, pag: 1 })
    cautareUrlSample ??= cautareUrl

    let searchHtml: string
    try {
      searchHtml = await fetchText(cautareUrl, { headers: { 'User-Agent': UA }, timeout: 55_000 })
    } catch (e1) {
      const fallbackUrl = buildCautaFallbackUrl({ sir, dat1, dat2, leg, idl })
      try {
        searchHtml = await fetchText(fallbackUrl, { headers: { 'User-Agent': UA }, timeout: 55_000 })
      } catch (e2) {
        errors.push(`${pol.name}: cautare ${(e1 as Error).message}; cauta ${(e2 as Error).message}`)
        continue
      }
    }

    const links = extractStenogramLinks(searchHtml)
    if (!links.length) {
      log(`[cdep-steno] no stenogram links for sir="${sir.slice(0, 40)}"`)
      continue
    }

    for (const stUrl of links) {
      if (queued >= maxQueueInserts || fetchesBudget <= 0) break
      fetchesBudget--
      transcriptsFetched++

      let stHtml: string
      try {
        stHtml = await fetchText(stUrl, { headers: { 'User-Agent': UA }, timeout: 55_000 })
      } catch (e) {
        errors.push(`${pol.name}: stenogram fetch ${(e as Error).message}`)
        continue
      }

      const plain = stripTags(stHtml)
      const excerpt = excerptAround(plain, fullNorm, 360)
      if (!excerpt) continue

      const excerptNorm = normalizeText(excerpt)
      const conf = confidenceForMatch(fullNorm, excerptNorm)
      if (conf < 70) continue

      const recordType = classifyRecordType(excerptNorm)
      const frag = hashFragment([pol.id, stUrl, excerptNorm.slice(0, 240)])
      const articleUrl = `${stUrl}#tevad-${frag}`
      if (await urlSeen(opts.supabase, articleUrl)) {
        skippedSeen++
        continue
      }

      const title = `Stenogramă CDEP · ${sir.slice(0, 80)}`
      try {
        const res = await queueSteno(opts.supabase, {
          politicianId: pol.id,
          articleUrl,
          title,
          recordType,
          excerpt: excerptNorm.slice(0, 1200),
          confidence: conf,
          pubDateIso: null,
        })
        if (res === 'queued') {
          queued++
          log(`[cdep-steno] queued ${recordType} conf=${conf} — ${sir}`)
        } else if (res === 'dup') {
          skippedSeen++
        }
      } catch (e) {
        errors.push(`${pol.name}: queue ${(e as Error).message}`)
      }
    }
  }

  const nextPoliticianIndex = (startIdx + politiciansProcessed) % polRows.length
  await setState(opts.supabase, 'cdep_steno:politician_index', String(nextPoliticianIndex))
  await setState(opts.supabase, 'cdep_steno:last_ok_at', new Date().toISOString())
  if (errors.length) {
    await setState(opts.supabase, 'cdep_steno:last_error', errors.slice(0, 3).join(' | ').slice(0, 900))
  } else {
    await setState(opts.supabase, 'cdep_steno:last_error', '')
  }

  return {
    ok: errors.length === 0 || queued > 0 || transcriptsFetched > 0,
    politiciansProcessed,
    transcriptsFetched,
    queued,
    skippedSeen,
    nextPoliticianIndex,
    errors,
    cautareUrlSample,
  }
}

/** CLI: `tsx packages/scraper/src/cdep-steno.ts` */
async function cliMain() {
  const { createServiceClient } = await import('./supabase-env')
  const supabase = createServiceClient()
  const r = await runCdepStenoBatch({
    supabase,
    log: console.log,
    limitPoliticians: Number(process.env.CDEP_STENO_LIMIT_POLITICIANS ?? '') || 2,
    maxQueueInserts: Number(process.env.CDEP_STENO_MAX_QUEUE ?? '') || 5,
    maxTranscriptFetches: Number(process.env.CDEP_STENO_MAX_FETCHES ?? '') || 4,
    windowDays: Number(process.env.CDEP_STENO_WINDOW_DAYS ?? '') || 14,
  })
  console.log(JSON.stringify(r, null, 2))
}

if (process.argv[1]?.replace(/\\/g, '/').includes('cdep-steno.ts')) {
  cliMain().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
