import { slugify } from './slugify'

/** Word tokens from a display name (Romanian-safe), order not preserved. */
export function nameIdentityTokens(name: string): string[] {
  const s = slugify(name)
  return s.split('-').map(t => t.trim()).filter(Boolean)
}

/**
 * Stable fingerprint for "same person, words in different order"
 * (e.g. "Nicușor Dan" vs "Dan Nicușor" → "dan-nicusor").
 */
export function nameIdentitySignature(name: string): string {
  const t = nameIdentityTokens(name)
  if (t.length === 0) return slugify(name) || 'unknown'
  return [...t].sort().join('-')
}
