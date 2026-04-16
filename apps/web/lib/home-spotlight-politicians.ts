import type { SpotlightPoliticianLike } from '@/lib/dedupe-politicians'
import { executiveChamberRank } from '@/lib/executive-chamber'

function num(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

/** Președinte → prim-ministru → cabinet; cap cabinet so total stays readable (default 5). */
export function sortAndCapSpotlightPoliticians(
  rows: SpotlightPoliticianLike[],
  opts: { maxTotal?: number; maxCabinet?: number } = {}
): SpotlightPoliticianLike[] {
  const maxTotal = opts.maxTotal ?? 5
  const maxCabinet = opts.maxCabinet ?? 3

  const sorted = [...rows].sort((a, b) => {
    const d = executiveChamberRank(a.chamber) - executiveChamberRank(b.chamber)
    if (d !== 0) return d
    return num(b.score) - num(a.score)
  })

  const out: SpotlightPoliticianLike[] = []
  let cabinet = 0

  for (const p of sorted) {
    if (out.length >= maxTotal) break
    const r = executiveChamberRank(p.chamber)
    if (r < 2) {
      out.push(p)
      continue
    }
    if (r === 2 && cabinet < maxCabinet) {
      out.push(p)
      cabinet++
    }
  }

  return out
}
