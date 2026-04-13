interface StatsBarProps {
  total: number
  broken: number
  pending: number
  avgScore: number
}

export default function StatsBar({ total, broken, pending, avgScore }: StatsBarProps) {
  const scoreColor = avgScore > 50 ? 'var(--green)' : 'var(--red)'

  const items = [
    { value: total, label: 'Total politicieni', color: 'var(--blue)' },
    { value: broken, label: 'Promisiuni false', color: 'var(--red)' },
    { value: pending, label: 'În verificare', color: 'var(--amber)' },
    { value: avgScore, label: 'Scor mediu', color: scoreColor },
  ] as const

  return (
    <section
      className="tev-stats-surface w-full border-b border-[var(--gray-200)] py-3 md:py-4"
      aria-label="Indicatori principali"
    >
      <div className="mx-auto max-w-[1100px] px-4 md:px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--gray-200)] bg-[var(--white)] shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col divide-y divide-[var(--gray-200)] md:flex-row md:divide-y-0 md:divide-x">
            {items.map(m => (
              <div key={m.label} className="flex flex-1 flex-col justify-center px-5 py-4 md:px-8 md:py-5">
                <div
                  className="font-mono text-[22px] font-bold tabular-nums leading-none md:text-[28px]"
                  style={{ color: m.color }}
                >
                  {m.value}
                </div>
                <div className="mt-2 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-800)] md:text-[13px]">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
