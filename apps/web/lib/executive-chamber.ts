/**
 * Ordering of national / parliament offices for UI when one person has
 * several rows (e.g. deputat + ministru in cabinet).
 * Lower number = more senior headline role.
 */
export function executiveChamberRank(chamber: string): number {
  const c = (chamber ?? '').toLowerCase()
  if (c === 'president') return 0
  if (c === 'premier') return 1
  if (c === 'minister' || c === 'ministru') return 2
  if (c === 'senator') return 3
  if (c === 'deputat') return 4
  return 50
}

export function pickMoreSeniorOfficeRow<T extends { role: string; chamber: string }>(a: T, b: T): T {
  const ra = executiveChamberRank(a.chamber)
  const rb = executiveChamberRank(b.chamber)
  if (ra !== rb) return ra < rb ? a : b
  if (a.role.length !== b.role.length) return a.role.length >= b.role.length ? a : b
  return a
}

export const EXECUTIVE_SPOTLIGHT_CHAMBERS = ['president', 'premier', 'minister', 'ministru'] as const

/** Short label for chamber chip (profile, lists). */
export function chamberBadgeLabelPublic(chamber: string): string {
  const c = (chamber ?? '').toLowerCase()
  if (c === 'president') return 'Președinte'
  if (c === 'premier') return 'Prim-ministru'
  if (c === 'minister' || c === 'ministru') return 'Guvern'
  if (c === 'senator') return 'Senator'
  if (c === 'deputat') return 'Deputat'
  return chamber
}
