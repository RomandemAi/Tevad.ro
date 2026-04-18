import type { SupabaseClient } from '@supabase/supabase-js'

/** Stable key for “same article” across utm/fbclid/hash and trailing slash variants. */
export function normalizeArticleUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  try {
    const u = new URL(/^[a-z]+:/i.test(s) ? s : `https://${s}`)
    u.hash = ''
    for (const k of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'mc_cid',
      'mc_eid',
    ]) {
      u.searchParams.delete(k)
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    u.pathname = path || '/'
    u.hostname = u.hostname.replace(/^www\./i, '')
    return u.href
  } catch {
    const noHash = s.split('#')[0] ?? s
    return noHash.split('?')[0] ?? noHash
  }
}

const CHUNK = 200

/**
 * True if this politician already has any record whose sources include this article URL
 * (normalized match). Prevents duplicate cards from the same HotNews / media piece.
 */
export async function politicianHasRecordWithArticleUrl(
  supabase: SupabaseClient,
  politicianId: string,
  articleUrl: string
): Promise<boolean> {
  const target = normalizeArticleUrl(articleUrl)
  if (!target) return false

  const { data: recIds, error } = await supabase.from('records').select('id').eq('politician_id', politicianId)
  if (error || !recIds?.length) return false

  const ids = recIds.map(r => (r as { id: string }).id)
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data: srcs, error: sErr } = await supabase.from('sources').select('url').in('record_id', slice)
    if (sErr) continue
    for (const row of srcs ?? []) {
      const u = String((row as { url?: string }).url ?? '')
      if (u && normalizeArticleUrl(u) === target) return true
    }
  }
  return false
}
