export type Verdict = 'true' | 'false' | 'partial' | 'pending'

export type StatementType = 'promise' | 'statement' | 'vote'

export interface BlindSource {
  outlet: string
  url: string
  tier: number
  title?: string
  excerpt?: string
  publishedAt?: string
  lean?: 'left' | 'right' | 'center' | 'official'
}

/** Payload sent to models — no politician identity. */
export interface BlindPayload {
  statement: string
  type: StatementType
  date: string
  sources: BlindSource[]
}

export interface ModelResult {
  verdict: Verdict
  confidence: number
  reasoning: string
  canBeDecided: boolean
  requiresMoreSources: boolean
  /**
   * Only for STATEMENT type in the user prompt: materiality (public-policy vs personal).
   * Persisted to `records.impact_level` for declarații only. Promises/votes must omit this key.
   */
  impact_level?: 'high' | 'medium' | 'low'
}
