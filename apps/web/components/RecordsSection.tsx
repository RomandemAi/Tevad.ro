'use client'

import { useState, useMemo } from 'react'
import RecordCard from './RecordCard'

type RecordStatus = 'true' | 'false' | 'partial' | 'pending'
type RecordType   = 'promise' | 'statement' | 'vote'

interface RecordData {
  id: string
  type: RecordType
  text: string
  status: RecordStatus
  date_made: string
  impact_level: string
  likes: number
  dislikes: number
  ai_confidence?: number
  sources: any[]
}

interface RecordsSectionProps {
  records: RecordData[]
  politicianId: string
}

const TYPE_LABELS: Record<string, string>   = { all: 'Toate', promise: 'Promisiuni', statement: 'Declarații', vote: 'Voturi' }
const STATUS_LABELS: Record<string, string> = { all: 'Toate', true: 'Adevărat', false: 'Fals', partial: 'Parțial', pending: 'Pending' }

const STATUS_ACTIVE: Record<string, string> = {
  true:    'border-[rgba(34,201,122,0.4)] text-[var(--green)] bg-[rgba(34,201,122,0.08)]',
  false:   'border-[rgba(240,69,69,0.4)] text-[var(--red)] bg-[rgba(240,69,69,0.08)]',
  partial: 'border-[rgba(245,166,35,0.4)] text-[var(--amber)] bg-[rgba(245,166,35,0.08)]',
  pending: 'border-[var(--border2)] text-[var(--text2)] bg-[var(--surface2)]',
  all:     'border-[var(--accent)] text-[var(--accent2)] bg-[rgba(29,110,245,0.08)]',
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
      onClick={onClick}
      className={`font-mono text-[9px] uppercase px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors ${
        active
          ? color ?? STATUS_ACTIVE.all
          : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
      }`}
    >
      {label}
    </button>
  )
}

export default function RecordsSection({ records, politicianId }: RecordsSectionProps) {
  const [typeFilter, setTypeFilter]     = useState<RecordType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (typeFilter !== 'all'   && r.type   !== typeFilter)   return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [records, typeFilter, statusFilter])

  // Count per status for badges
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [records])

  return (
    <div>
      {/* Filter bar */}
      <div className="space-y-2 mb-4">
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
