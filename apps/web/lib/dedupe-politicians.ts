import type { Politician } from '@/components/politician-types'
import { nameIdentitySignature } from '@tevad/scraper/name-identity'

function num(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function pickDisplayName(a: string, b: string): string {
  if (a.length !== b.length) return a.length >= b.length ? a : b
  return a.localeCompare(b, 'ro') <= 0 ? a : b
}

/** Prefer the row that looks like the fuller / primary profile. */
function pickPrimary(a: Politician, b: Politician): [Politician, Politician] {
  const trA = num(a.total_records),
    trB = num(b.total_records)
  if (trB > trA) return [b, a]
  if (trA > trB) return [a, b]
  const scA = num(a.score),
    scB = num(b.score)
  if (scB > scA) return [b, a]
  if (scA > scB) return [a, b]
  return a.slug <= b.slug ? [a, b] : [b, a]
}

function mergePair(primary: Politician, secondary: Politician): Politician {
  return {
    ...primary,
    name: pickDisplayName(primary.name, secondary.name),
    total_records: num(primary.total_records) + num(secondary.total_records),
    records_true: num(primary.records_true) + num(secondary.records_true),
    records_false: num(primary.records_false) + num(secondary.records_false),
    records_partial: num(primary.records_partial) + num(secondary.records_partial),
    records_pending: num(primary.records_pending) + num(secondary.records_pending),
    score: Math.round((num(primary.score) + num(secondary.score)) / 2),
    score_promises: Math.round((num(primary.score_promises) + num(secondary.score_promises)) / 2),
    score_reactions: Math.round((num(primary.score_reactions) + num(secondary.score_reactions)) / 2),
    score_sources: Math.round((num(primary.score_sources) + num(secondary.score_sources)) / 2),
    score_consistency: Math.round(
      (num(primary.score_consistency) + num(secondary.score_consistency)) / 2
    ),
  }
}

/**
 * Collapse rows that are the same person with words in a different order
 * (e.g. "Nicușor Dan" vs "Dan Nicușor"). Keeps one slug (primary row) and
 * merges headline counts for the home list / hero aggregates.
 */
export function dedupePoliticiansByNameIdentity(rows: Politician[]): Politician[] {
  const map = new Map<string, Politician>()
  for (const p of rows) {
    const sig = nameIdentitySignature(p.name)
    const cur = map.get(sig)
    if (!cur) {
      map.set(sig, p)
      continue
    }
    const [pri, sec] = pickPrimary(cur, p)
    map.set(sig, mergePair(pri, sec))
  }
  return Array.from(map.values())
}

/** Same person, different name order in spotlight cards (premier / president). */
export interface SpotlightPoliticianLike {
  id: string
  slug: string
  name: string
  role: string
  party_short: string | null
  score: number | null
  chamber: string
}

function pickSpotlightPrimary(a: SpotlightPoliticianLike, b: SpotlightPoliticianLike): SpotlightPoliticianLike {
  const sa = num(a.score)
  const sb = num(b.score)
  if (sb !== sa) return sb > sa ? b : a
  const aIlie = /^ilie\b/i.test(a.name.trim())
  const bIlie = /^ilie\b/i.test(b.name.trim())
  if (aIlie !== bIlie) return aIlie ? a : b
  return a.slug.localeCompare(b.slug) <= 0 ? a : b
}

export function dedupeSpotlightPoliticians(rows: SpotlightPoliticianLike[]): SpotlightPoliticianLike[] {
  const map = new Map<string, SpotlightPoliticianLike>()
  for (const p of rows) {
    const sig = nameIdentitySignature(p.name)
    const cur = map.get(sig)
    if (!cur) {
      map.set(sig, p)
      continue
    }
    map.set(sig, pickSpotlightPrimary(cur, p))
  }
  return Array.from(map.values())
}
