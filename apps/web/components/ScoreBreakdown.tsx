import { scoreColor } from '@/lib/score-utils'

interface ScoreBreakdownProps {
  promises: number
  reactions: number
  sources: number
  consistency: number
}

type RowKey = 'promises' | 'reactions' | 'sources' | 'consistency'

const ROWS: { label: string; weight: string; key: RowKey }[] = [
  { label: 'Promisiuni', weight: '35%', key: 'promises' },
  { label: 'Surse', weight: '25%', key: 'sources' },
  { label: 'Consistență', weight: '20%', key: 'consistency' },
  { label: 'Reacții', weight: '20%', key: 'reactions' },
]

export default function ScoreBreakdown({
  promises,
  reactions,
  sources,
  consistency,
}: ScoreBreakdownProps) {
  const vals = { promises, reactions, sources, consistency }

  return (
    <div className="mt-8 space-y-4 border-t border-[var(--gray-100)] pt-6">
      {ROWS.map(row => {
        const v = vals[row.key]
        const col = scoreColor(v)
        return (
          <div key={row.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                {row.label}
              </span>
              <span className="font-mono text-[13px] font-medium tabular-nums" style={{ color: col }}>
                {v}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray-200)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: col }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
