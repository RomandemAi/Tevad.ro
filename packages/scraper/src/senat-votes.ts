/**
 * packages/scraper/src/senat-votes.ts — Senatul României (Votul în plen)
 *
 * Discover vote AppIDs from https://www.senat.ro/Voturiplen.aspx and parse
 * VoturiPlenDetaliu.aspx?AppID=... pages (aggregate + group totals + roll-call).
 */
import { createServiceClient } from './supabase-env'
import { fetchFormText, fetchText } from './fetch-text'

const SENAT_BASE = 'https://www.senat.ro'
const LIST_URL = `${SENAT_BASE}/Voturiplen.aspx`

const DEFAULT_MONTHS_BACK = 2
const UA = 'Tevad.ro Data Pipeline (contact: open@tevad.ro; +https://tevad.ro)'

type ParsedVote = {
  externalId: string
  url: string
  voteDate: string | null
  voteKind: string | null
  code: string | null
  title: string | null
  description: string | null
  counts: {
    present: number | null
    forCount: number | null
    againstCount: number | null
    abstainCount: number | null
    presentNotVotedCount: number | null
  }
  groupTotals: Array<{
    groupName: string
    forCount: number | null
    againstCount: number | null
    abstainCount: number | null
    presentNotVotedCount: number | null
    raw: Record<string, unknown>
  }>
  ballots: Array<{
    senatorId: string | null
    lastName: string | null
    firstName: string | null
    groupName: string | null
    ballot: 'for' | 'against' | 'abstain' | 'present_not_voted' | 'unknown'
    voteMethod: string | null
    raw: Record<string, unknown>
  }>
  raw: Record<string, unknown>
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function toIsoDateFromRo(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function stripTags(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#351;|&scedil;/gi, 'ș')
    .replace(/&#539;|&tcedil;/gi, 'ț')
    .replace(/&#259;|&abreve;/gi, 'ă')
    .replace(/&#238;|&icirc;/gi, 'î')
    .replace(/&#226;|&acirc;/gi, 'â')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseIntLoose(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/[^\d]/g, '')
  if (!m) return null
  const n = Number(m)
  return Number.isFinite(n) ? n : null
}

function extractAppIds(html: string): string[] {
  const out = new Set<string>()
  const re = /VoturiPlenDetaliu\.aspx\?AppID=([0-9a-fA-F-]{36})/g
  for (;;) {
    const m = re.exec(html)
    if (!m) break
    out.add(m[1]!.toLowerCase())
  }
  return [...out]
}

function extractTables(html: string): string[] {
  const tables: string[] = []
  const re = /<table[\s\S]*?<\/table>/gi
  for (;;) {
    const m = re.exec(html)
    if (!m) break
    tables.push(m[0]!)
  }
  return tables
}

function parseHtmlTable(tableHtml: string): { headers: string[]; rows: string[][] } {
  const ths = [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => stripTags(m[1]!))
  const trs = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]!)
  const rows: string[][] = []
  for (const tr of trs) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => stripTags(m[1]!))
    if (tds.length) rows.push(tds)
  }
  return { headers: ths, rows }
}

function pickTable(html: string, mustInclude: string[]): string | null {
  const tables = extractTables(html)
  for (const t of tables) {
    const txt = stripTags(t).toLowerCase()
    if (mustInclude.every(s => txt.includes(s.toLowerCase()))) return t
  }
  return null
}

function parseDetail(externalId: string, url: string, html: string): ParsedVote {
  const text = stripTags(html)

  // Date: "din 26/05/2025"
  const dateRo = (text.match(/\bdin\s+(\d{2}\/\d{2}\/\d{4})\b/i) ?? [])[1] ?? null
  const voteDate = dateRo ? toIsoDateFromRo(dateRo) : null

  // Code: e.g. "L125/2025"
  const code = (text.match(/\b([A-Z]\d{1,5}\/\d{4})\b/) ?? [])[1] ?? null

  // Kind: e.g. "vot final"
  const voteKind = (text.match(/\b(vot\s+(final|pe\s+articole|secret|deschis))\b/i) ?? [])[1] ?? null

  // Title/description: take the first long sentence after the code header if present.
  const title =
    (text.match(/\b(Propunere legislativ[ăa][^]{0,240}?)(?=\s+Prezen)/i) ?? [])[1]?.trim() ?? null

  const description = title

  const present = parseIntLoose((text.match(/Prezen[țt]i:\s*(\d+)/i) ?? [])[1])
  const forCount = parseIntLoose((text.match(/\bPentru:\s*(\d+)/i) ?? [])[1])
  const againstCount = parseIntLoose((text.match(/\bContra:\s*(\d+)/i) ?? [])[1])
  const abstainCount = parseIntLoose((text.match(/Ab[țt]ineri:\s*(\d+)/i) ?? [])[1])
  const presentNotVotedCount = parseIntLoose((text.match(/Prezent\s*-\s*Nu\s+au\s+votat:\s*(\d+)/i) ?? [])[1])

  const groupTable =
    pickTable(html, ['Grup', 'Pentru', 'Contra']) ??
    pickTable(html, ['Grup', 'Pentru', 'Ab']) ??
    null
  const groupTotals: ParsedVote['groupTotals'] = []
  if (groupTable) {
    const parsed = parseHtmlTable(groupTable)
    const idx = {
      group: parsed.headers.findIndex(h => /grup/i.test(h)),
      for: parsed.headers.findIndex(h => /pentru/i.test(h)),
      against: parsed.headers.findIndex(h => /contra/i.test(h)),
      abstain: parsed.headers.findIndex(h => /ab/i.test(h)),
      pnv: parsed.headers.findIndex(h => /nu au votat/i.test(h)),
    }
    for (const r of parsed.rows) {
      const groupName = (r[idx.group] ?? '').trim()
      if (!groupName) continue
      groupTotals.push({
        groupName,
        forCount: parseIntLoose(r[idx.for]),
        againstCount: parseIntLoose(r[idx.against]),
        abstainCount: parseIntLoose(r[idx.abstain]),
        presentNotVotedCount: parseIntLoose(r[idx.pnv]),
        raw: { row: r, headers: parsed.headers },
      })
    }
  }

  const ballotTable = pickTable(html, ['Nume', 'Prenume', 'Tip vot']) ?? pickTable(html, ['Nume', 'Prenume']) ?? null
  const ballots: ParsedVote['ballots'] = []
  if (ballotTable) {
    const parsed = parseHtmlTable(ballotTable)
    const idx = {
      last: parsed.headers.findIndex(h => /^Nume$/i.test(h)),
      first: parsed.headers.findIndex(h => /^Prenume$/i.test(h)),
      group: parsed.headers.findIndex(h => /Grup/i.test(h)),
      for: parsed.headers.findIndex(h => /Pentru/i.test(h)),
      against: parsed.headers.findIndex(h => /Contra/i.test(h)),
      abstain: parsed.headers.findIndex(h => /Ab/i.test(h)),
      pnv: parsed.headers.findIndex(h => /Nu au votat/i.test(h)),
      method: parsed.headers.findIndex(h => /Tip vot/i.test(h)),
    }

    // Extract ParlamentarID from original table HTML by row (best-effort).
    const trHtmls = [...ballotTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]!)
    // Skip header row: first tr contains th.
    let dataRowIdx = 0
    for (const r of parsed.rows) {
      const lastName = (r[idx.last] ?? '').trim() || null
      const firstName = (r[idx.first] ?? '').trim() || null
      const groupName = (r[idx.group] ?? '').trim() || null
      const method = (r[idx.method] ?? '').trim() || null

      const cellFor = (r[idx.for] ?? '').toUpperCase()
      const cellAgainst = (r[idx.against] ?? '').toUpperCase()
      const cellAbstain = (r[idx.abstain] ?? '').toUpperCase()
      const cellPNV = (r[idx.pnv] ?? '').toUpperCase()
      const ballot =
        cellFor === 'X'
          ? 'for'
          : cellAgainst === 'X'
            ? 'against'
            : cellAbstain === 'X'
              ? 'abstain'
              : cellPNV === 'X'
                ? 'present_not_voted'
                : 'unknown'

      // Senator ID: try to find any ParlamentarID=GUID inside the concatenated row HTML.
      const rowHtml = trHtmls.filter((_, i) => i > 0)[dataRowIdx] ?? ''
      const senatorId =
        (rowHtml.match(/FisaSenator\.aspx\?ParlamentarID=([0-9a-fA-F-]{36})/i) ?? [])[1]?.toLowerCase() ?? null

      ballots.push({
        senatorId,
        lastName,
        firstName,
        groupName,
        ballot,
        voteMethod: method && /vot/i.test(method) ? method : method || null,
        raw: { row: r, headers: parsed.headers },
      })
      dataRowIdx++
    }
  }

  return {
    externalId,
    url,
    voteDate,
    voteKind,
    code,
    title,
    description,
    counts: { present, forCount, againstCount, abstainCount, presentNotVotedCount },
    groupTotals,
    ballots,
    raw: {
      parsedFrom: 'senat.ro',
      externalId,
      voteDate,
      code,
      present,
      forCount,
      againstCount,
      abstainCount,
      presentNotVotedCount,
    },
  }
}

async function fetchListPage(year?: number, month?: number): Promise<string> {
  const u = new URL(LIST_URL)
  if (year) u.searchParams.set('an', String(year))
  if (month) u.searchParams.set('luna', String(month))
  const url = u.toString()
  const html = await fetchText(url, { headers: { 'User-Agent': UA } })
  if (extractAppIds(html).length) return html

  // The listing page is ASP.NET and may require a postback to render results.
  const viewstate = (html.match(/name=\"__VIEWSTATE\"[^>]*value=\"([^\"]+)\"/i) ?? [])[1]
  const eventValidation = (html.match(/name=\"__EVENTVALIDATION\"[^>]*value=\"([^\"]+)\"/i) ?? [])[1]
  const viewstateGen = (html.match(/name=\"__VIEWSTATEGENERATOR\"[^>]*value=\"([^\"]+)\"/i) ?? [])[1]

  const searchBtn = html.match(/type=\"submit\"[^>]*name=\"([^\"]+)\"[^>]*value=\"([^\"]*Cautare[^\"]*)\"/i)
  const kwInput = html.match(/type=\"text\"[^>]*name=\"([^\"]*Cuvinte[^\"]*)\"/i)
  if (!viewstate || !searchBtn?.[1]) return html

  const body = new URLSearchParams()
  body.set('__EVENTTARGET', '')
  body.set('__EVENTARGUMENT', '')
  body.set('__VIEWSTATE', viewstate)
  if (viewstateGen) body.set('__VIEWSTATEGENERATOR', viewstateGen)
  if (eventValidation) body.set('__EVENTVALIDATION', eventValidation)
  if (kwInput?.[1]) body.set(kwInput[1], '')
  body.set(searchBtn[1], searchBtn[2] || 'Cautare')

  return fetchFormText(url, body, { 'User-Agent': UA })
}

function monthBack(from: Date, back: number): { year: number; month: number } {
  const d = new Date(from.getFullYear(), from.getMonth() - back, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export async function run(opts: { monthsBack?: number; limit?: number } = {}) {
  const supabase = createServiceClient()
  const monthsBack = Math.max(0, Math.min(12, opts.monthsBack ?? DEFAULT_MONTHS_BACK))
  const limit = Math.max(1, Math.min(250, opts.limit ?? 80))

  console.log(`[senat-votes] Discovering AppIDs (monthsBack=${monthsBack})...`)
  const appIds: string[] = []
  const now = new Date()
  for (let i = 0; i <= monthsBack; i++) {
    const { year, month } = monthBack(now, i)
    const html = await fetchListPage(year, month)
    for (const id of extractAppIds(html)) appIds.push(id)
    await sleep(350)
  }
  const unique = [...new Set(appIds)]
  let discovered = unique
  if (discovered.length === 0) {
    const seed = (process.env.SENAT_VOTES_SEED_APPIDS ?? '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => /^[0-9a-f-]{36}$/.test(s))
    if (seed.length) {
      console.log(`[senat-votes] No AppIDs discovered from list page; using seed env (${seed.length}).`)
      discovered = [...new Set(seed)]
    }
  }

  console.log(`[senat-votes] Found ${discovered.length} AppID(s).`)

  const toProcess = discovered.slice(0, limit)
  let ok = 0
  let errors = 0

  for (let i = 0; i < toProcess.length; i++) {
    const externalId = toProcess[i]!
    const url = `${SENAT_BASE}/VoturiPlenDetaliu.aspx?AppID=${externalId}`
    const idx = String(i + 1).padStart(String(toProcess.length).length, '0')
    try {
      if (i > 0) await sleep(450)
      const html = await fetchText(url, { headers: { 'User-Agent': UA } })
      const parsed = parseDetail(externalId, url, html)

      const payload = {
        chamber: 'senat',
        source: 'senat.ro',
        external_id: externalId,
        source_url: url,
        vote_date: parsed.voteDate,
        vote_kind: parsed.voteKind,
        code: parsed.code,
        title: parsed.title,
        description: parsed.description,
        present: parsed.counts.present,
        for_count: parsed.counts.forCount,
        against_count: parsed.counts.againstCount,
        abstain_count: parsed.counts.abstainCount,
        present_not_voted_count: parsed.counts.presentNotVotedCount,
        fetched_at: new Date().toISOString(),
        raw_json: { ...parsed.raw, groupTotals: parsed.groupTotals, ballots: parsed.ballots },
      }

      const { data: voteRow, error: upsertErr } = await supabase
        .from('parliament_votes')
        .upsert(payload, { onConflict: 'chamber,external_id' })
        .select('id')
        .maybeSingle()
      if (upsertErr || !voteRow?.id) throw new Error(upsertErr?.message ?? 'Upsert failed')

      const voteId = voteRow.id as string
      // Replace child rows for idempotency.
      await supabase.from('parliament_vote_group_totals').delete().eq('vote_id', voteId)
      await supabase.from('parliament_vote_ballots').delete().eq('vote_id', voteId)

      if (parsed.groupTotals.length) {
        const rows = parsed.groupTotals.map(g => ({
          vote_id: voteId,
          group_name: g.groupName,
          for_count: g.forCount,
          against_count: g.againstCount,
          abstain_count: g.abstainCount,
          present_not_voted_count: g.presentNotVotedCount,
          raw_row: g.raw,
        }))
        const { error } = await supabase.from('parliament_vote_group_totals').insert(rows)
        if (error) throw new Error(error.message)
      }

      if (parsed.ballots.length) {
        const ids = [...new Set(parsed.ballots.map(b => b.senatorId).filter((x): x is string => Boolean(x)))]
        const polMap = new Map<string, string>()
        if (ids.length) {
          const { data: pols, error } = await supabase.from('politicians').select('id, senat_id').in('senat_id', ids)
          if (error) throw new Error(error.message)
          for (const p of pols ?? []) {
            if (p?.senat_id && p?.id) polMap.set(String(p.senat_id).toLowerCase(), String(p.id))
          }
        }

        const rows = parsed.ballots.map(b => ({
          vote_id: voteId,
          politician_id: b.senatorId ? polMap.get(b.senatorId.toLowerCase()) ?? null : null,
          senator_id: b.senatorId,
          last_name: b.lastName,
          first_name: b.firstName,
          group_name: b.groupName,
          ballot: b.ballot,
          vote_method: b.voteMethod,
          raw_row: b.raw,
          source_url: url,
        }))
        const { error } = await supabase.from('parliament_vote_ballots').insert(rows)
        if (error) throw new Error(error.message)
      }

      ok++
      console.log(`[senat-votes] ${idx}/${toProcess.length} ${externalId} ✓ (${parsed.code ?? 'no-code'})`)
    } catch (e) {
      errors++
      console.error(`[senat-votes] ${idx}/${toProcess.length} ${externalId}:`, (e as Error).message)
    }
  }

  console.log(`[senat-votes] Done. ${ok} ok, ${errors} errors.`)
  return { ok, errors, found: discovered.length, processed: toProcess.length }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('senat-votes.ts')) {
  const monthsBack = Number(process.env.SENAT_VOTES_MONTHS_BACK ?? '') || undefined
  const limit = Number(process.env.SENAT_VOTES_LIMIT ?? '') || undefined
  run({ monthsBack, limit }).catch(e => {
    console.error('[senat-votes] failed:', e)
    process.exit(1)
  })
}

