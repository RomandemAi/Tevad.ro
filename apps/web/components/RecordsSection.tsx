'use client'

import { useState, useMemo } from 'react'
import RecordCard from './RecordCard'
import { dedupePublicStatementRows } from '@/lib/dedupe-records-for-display'

type RecordStatus = 'true' | 'false' | 'partial' | 'pending'
type RecordType   = 'promise' | 'statement' | 'vote'

interface RecordData {
  id: string
  slug?: string
  type: RecordType
  text: string
  status: RecordStatus
  date_made: string
  created_at?: string
  impact_level: string
  likes: number
  dislikes: number
  ai_confidence?: number
  opinion_exempt?: boolean
  ai_reasoning?: string | null
  plain_summary?: string | null
  ai_explain?: string | null
  ai_model_votes?: unknown
  sources: any[]
}

interface RecordsSectionProps {
  records: RecordData[]
  politicianId: string
}

const TYPE_LABELS: Record<string, string>   = { all: 'Toate', promise: 'Promisiuni', statement: 'Declarații', vote: 'Voturi' }
const STATUS_LABELS: Record<string, string> = { all: 'Toate', true: 'Adevărat', false: 'Fals', partial: 'Parțial', pending: 'Pending' }

const STATUS_ACTIVE: Record<string, string> = {
  true: 'border-[rgba(22,163,74,0.4)] bg-[var(--green-bg)] text-[var(--green)]',
  false: 'border-[rgba(220,38,38,0.4)] bg-[var(--red-bg)] text-[var(--red)]',
  partial: 'border-[rgba(217,119,6,0.4)] bg-[var(--amber-bg)] text-[var(--amber)]',
  pending: 'border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-600)]',
  all: 'border-[var(--blue)] bg-[var(--blue-light)] text-[var(--blue)]',
}

function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[36px] cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase flex-shrink-0 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 md:min-h-0 ${
        active
          ? color ?? STATUS_ACTIVE.all
          : 'border-[var(--gray-200)] text-[var(--gray-500)] hover:border-[var(--gray-200)] hover:text-[var(--gray-900)]'
      }`}
    >
      {label}
    </button>
  )
}

export default function RecordsSection({ records, politicianId }: RecordsSectionProps) {
  const [typeFilter, setTypeFilter]     = useState<RecordType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all')

  const deduped = useMemo(() => dedupePublicStatementRows(records), [records])

  const filtered = useMemo(() => {
    return deduped.filter(r => {
      if (typeFilter !== 'all'   && r.type   !== typeFilter)   return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [deduped, typeFilter, statusFilter])

  // Count per status for badges (after article-URL dedupe)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of deduped) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [deduped])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
          Înregistrări verificate
        </h2>
        <span className="rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[var(--gray-500)]">
          AI + surse · poate greși
        </span>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'promise', 'statement', 'vote'] as const).map(t => (
            <FilterPill
              key={t}
              label={TYPE_LABELS[t]}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'true', 'false', 'partial', 'pending'] as const).map(s => (
            <FilterPill
              key={s}
              label={`${STATUS_LABELS[s]}${s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}`}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              color={s !== 'all' ? STATUS_ACTIVE[s] : undefined}
            />
          ))}
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 font-mono text-[11px] text-[var(--text3)]">
          NICIO ÎNREGISTRARE PENTRU FILTRUL SELECTAT
        </div>
      ) : (
        filtered.map(record => (
          <RecordCard key={record.id} record={record} politicianId={politicianId} />
        ))
      )}
    </div>
  )
}
