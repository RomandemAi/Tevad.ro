export interface Politician {
  id: string
  slug: string
  name: string
  role: string
  party: string
  party_short: string
  chamber: string
  score: number
  total_records: number
  records_true: number
  records_false: number
  records_partial: number
  records_pending: number
  avatar_color: string | null
  avatar_text_color: string | null
  /** Official portrait URL (e.g. gov.ro cabinet) */
  avatar_url?: string | null
  score_promises?: number | null
  score_declaratii?: number | null
  score_reactions?: number | null
  score_sources?: number | null
  score_consistency?: number | null
}
