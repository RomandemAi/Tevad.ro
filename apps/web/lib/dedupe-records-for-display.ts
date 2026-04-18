import { normalizeArticleUrl } from '@tevad/rss-monitor/article-dedupe'

type RecordStatus = 'true' | 'false' | 'partial' | 'pending'

export interface RecordRowForDedupe {
  id: string
  type: string
  text: string
  status: RecordStatus
  date_made: string
  created_at?: string
  ai_confidence?: number
  politician_id?: string
  opinion_exempt?: boolean
  ai_reasoning?: string | null
  impact_level?: string
  sources?: Array<{ url?: string; tier?: string | number }>
  /** Supabase join shape */
  politicians?: { id?: string } | Array<{ id?: string }> | null
}

function extractPoliticianId(r: RecordRowForDedupe): string {
  if (r.politician_id) return r.politician_id
  const p = r.politicians
  if (Array.isArray(p) && p[0]?.id) return String(p[0].id)
  if (p && typeof p === 'object' && 'id' in p && (p as { id?: string }).id) return String((p as { id: string }).id)
  return ''
}

/** Prefer media (tier 1/2) URL; else first source — matches verify cron insert order when possible. */
function primaryArticleUrl(sources: RecordRowForDedupe['sources']): string | null {
  if (!sources?.length) return null
  const tStr = (t: string | number | undefined) => String(t ?? '')
  const media = sources.find(s => {
    const t = tStr(s.tier)
    return t === '1' || t === '2'
  })
  if (media?.url) return media.url
  return sources[0]?.url ?? null
}

function statusRank(s: RecordStatus): number {
  switch (s) {
    case 'true':
      return 4
    case 'partial':
      return 3
    case 'false':
      return 2
    default:
      return 1
  }
}

function pickBetterRecord<T extends RecordRowForDedupe>(a: T, b: T): T {
  const confA = typeof a.ai_confidence === 'number' ? a.ai_confidence : -1
  const confB = typeof b.ai_confidence === 'number' ? b.ai_confidence : -1
  if (confA !== confB) return confA > confB ? a : b
  const srA = statusRank(a.status)
  const srB = statusRank(b.status)
  if (srA !== srB) return srA > srB ? a : b
  const tA = new Date(a.created_at ?? a.date_made).getTime()
  const tB = new Date(b.created_at ?? b.date_made).getTime()
  return tA >= tB ? a : b
}

function sortByDateDesc<T extends RecordRowForDedupe>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = new Date(a.date_made).getTime()
    const db = new Date(b.date_made).getTime()
    return db - da
  })
}

/**
 * Collapse duplicate rows per politician + canonical article URL (queue / re-ingest).
 * Partition includes politician so multi-politician feeds (e.g. /declaratii) never merge across people.
 */
export function dedupeRecordsByArticleUrl<T extends RecordRowForDedupe>(records: T[]): T[] {
  const byKey = new Map<string, T>()
  const passthrough: T[] = []

  for (const r of records) {
    const raw = primaryArticleUrl(r.sources)
    const pol = extractPoliticianId(r) || `_row_${r.id}`
    if (!raw) {
      passthrough.push(r)
      continue
    }
    const k = normalizeArticleUrl(raw)
    if (!k) {
      passthrough.push(r)
      continue
    }
    const composite = `${pol}|${k}`
    const prev = byKey.get(composite)
    if (!prev) byKey.set(composite, r)
    else byKey.set(composite, pickBetterRecord(prev, r))
  }

  return sortByDateDesc([...Array.from(byKey.values()), ...passthrough])
}

function normalizeStatementText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 800)
}

/**
 * Second pass: same politician + same statement text (after the article-URL pass).
 * Catches duplicates when sources were missing from the query or URLs differ slightly.
 * Very short strings are not merged (avoids collapsing unrelated micro-lines).
 */
export function dedupeRecordsByPoliticianAndText<T extends RecordRowForDedupe>(records: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const r of records) {
    const pol = extractPoliticianId(r) || `_row_${r.id}`
    const nt = normalizeStatementText(r.text)
    if (nt.length < 24) {
      byKey.set(`${pol}|__short__${r.id}`, r)
      continue
    }
    const composite = `${pol}|${nt}`
    const prev = byKey.get(composite)
    if (!prev) byKey.set(composite, r)
    else byKey.set(composite, pickBetterRecord(prev, r))
  }
  return sortByDateDesc(Array.from(byKey.values()))
}

/** URL dedupe then text dedupe — use for politician profile and /declaratii lists. */
export function dedupePublicStatementRows<T extends RecordRowForDedupe>(records: T[]): T[] {
  return dedupeRecordsByPoliticianAndText(dedupeRecordsByArticleUrl(records))
}
