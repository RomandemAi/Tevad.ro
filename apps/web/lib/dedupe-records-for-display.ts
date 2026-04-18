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
  sources?: Array<{ url?: string; tier?: string | number }>
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

/**
 * Collapse duplicate politician records that share the same canonical article URL
 * (e.g. double queue / re-ingest). Keeps the stronger verification (confidence, then
 * verdict rank, then recency). Rows without a usable URL are all kept.
 */
export function dedupeRecordsByArticleUrl<T extends RecordRowForDedupe>(records: T[]): T[] {
  const byKey = new Map<string, T>()
  const passthrough: T[] = []

  for (const r of records) {
    const raw = primaryArticleUrl(r.sources)
    if (!raw) {
      passthrough.push(r)
      continue
    }
    const k = normalizeArticleUrl(raw)
    if (!k) {
      passthrough.push(r)
      continue
    }
    const prev = byKey.get(k)
    if (!prev) byKey.set(k, r)
    else byKey.set(k, pickBetterRecord(prev, r))
  }

  const merged = [...Array.from(byKey.values()), ...passthrough]
  merged.sort((a, b) => {
    const da = new Date(a.date_made).getTime()
    const db = new Date(b.date_made).getTime()
    return db - da
  })
  return merged
}
