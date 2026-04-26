import { scoreColor } from '@/lib/score-utils'

interface ScoreBreakdownProps {
  promises: number
  declaratii: number
  reactions: number
  sources: number
  consistency: number
}

type RowKey = 'promises' | 'declaratii' | 'sources' | 'consistency' | 'reactions'

const ROWS: { label: string; weight: string; key: RowKey }[] = [
  { label: 'Promisiuni', weight: '30%', key: 'promises' },
  { label: 'Declarații', weight: '18%', key: 'declaratii' },
  { label: 'Surse', weight: '22%', key: 'sources' },
  { label: 'Consistență', weight: '15%', key: 'consistency' },
  { label: 'Reacții', weight: '15%', key: 'reactions' },
]

export default function ScoreBreakdown({
  promises,
  declaratii,
  reactions,
  sources,
  consistency,
}: ScoreBreakdownProps) {
  const vals = { promises, declaratii, reactions, sources, consistency }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--gray-100)] pb-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gray-500)]">
          Scor credibilitate
        </h2>
        <span className="font-mono text-[9px] text-[var(--gray-400)]">ponderi oficiale</span>
      </div>
      {ROWS.map(row => {
        const v = vals[row.key]
        const col = scoreColor(v)
        return (
          <div key={row.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--gray-500)]">
                {row.label}
                <span className="ml-1.5 font-mono text-[9px] font-normal normal-case tracking-normal text-[var(--gray-400)]">
                  {row.weight}
                </span>
              </span>
              <span className="font-mono text-[13px] font-medium tabular-nums" style={{ color: col }}>
                {v}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray-200)]">
              <div className="h-full rounded-full transition-all duration-[var(--duration-1)] ease-[var(--ease-out)]" style={{ width: `${v}%`, backgroundColor: col }} />
            </div>
            {row.key === 'declaratii' && (
              <p className="mt-1.5 max-w-[28rem] font-mono text-[9px] leading-snug text-[var(--gray-400)]">
                Amestec factual pe declarații verificabile; nu reflectă îndeplinirea promisiunilor.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
