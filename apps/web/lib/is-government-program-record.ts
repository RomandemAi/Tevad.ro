/**
 * Records seeded from the coalition Government Programme use slug prefix `gov-program-`
 * and/or carry provenance in `context` (see seed-government-program).
 */
export function isGovernmentProgramRecord(slug: string, context?: string | null): boolean {
  if (slug.startsWith('gov-program-')) return true
  if (context?.includes('Referință (program):')) return true
  return false
}

export const GOV_PROGRAM_FILTER_PARAM = 'filter' as const
export const GOV_PROGRAM_FILTER_VALUE = 'gov-program' as const
