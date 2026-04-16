/**
 * Map verification_queue.record_type + quote text to records.type.
 * Forward-looking commitments (e.g. referendum) should be `promise`, not `statement`.
 */

export type RecordKind = 'promise' | 'statement' | 'vote'

function normalizeExplicit(t: string | null | undefined): RecordKind | null {
  if (t === 'promise' || t === 'statement' || t === 'vote') return t
  return null
}

/** Romanian / common political phrasing for future action (conservative). */
export function looksLikeForwardCommitment(text: string): boolean {
  const q = text.trim()
  if (q.length < 12) return false
  const lower = q.toLowerCase()

  if (/\b(vot|voturi)\b/.test(lower) && /\b(în senat|in senat|camera deputa|parlament)\b/.test(lower)) {
    return false
  }

  if (/\b(referendum|referendu)\b/i.test(lower)) {
    if (
      /\b(vom|voi|vă vom|ne vom|vom\s+organiza|vom\s+face|vom\s+convoca|organiza\s+un|face\s+un)\b/i.test(
        lower
      )
    ) {
      return true
    }
  }

  if (/\b(ne angajăm|ne-am angajat|angajament)\b/i.test(lower) && /\b(vom|voi|să\s+facem)\b/i.test(lower)) {
    return true
  }

  if (/\b(programului de guvernare|program de guvernare)\b/i.test(lower) && /\b(vom|voi|implement)\b/i.test(lower)) {
    return true
  }

  return false
}

/**
 * Explicit queue type wins unless it is `statement` but the quote is clearly a forward commitment.
 */
export function resolveRecordTypeFromQueue(recordType: string | null | undefined, quoteText: string): RecordKind {
  const explicit = normalizeExplicit(recordType ?? null)
  if (explicit === 'vote') return 'vote'
  if (explicit === 'promise') return 'promise'

  if (looksLikeForwardCommitment(quoteText)) return 'promise'

  if (explicit === 'statement') return 'statement'

  return 'statement'
}
