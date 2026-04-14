import Link from 'next/link'

interface StatsBarProps {
  total: number
  broken: number
  pending: number
  avgScore: number
}

export default function StatsBar({ total, broken, pending, avgScore }: StatsBarProps) {
  const scoreColor = avgScore > 50 ? 'var(--green)' : 'var(--red)'

  const items = [
    {
      value: total,
      label: 'Total politicieni',
      color: 'var(--blue)',
      href: '/' as const,
      aria: `Deschide lista celor ${total} politicieni monitorizați`,
    },
    {
      value: broken,
      label: 'Promisiuni false',
      color: 'var(--red)',
      href: '/broken' as const,
      aria: `Vezi cele ${broken} promisiuni false verificate`,
    },
    {
      value: pending,
      label: 'În verificare',
      color: 'var(--amber)',
      href: '/promises?status=pending' as const,
      aria: `Vezi înregistrările în verificare (filtru pending) — ${pending} în total pe site`,
    },
    {
      value: avgScore,
      label: 'Scor mediu',
      color: scoreColor,
      href: '/#clasament' as const,
      aria: `Clasament după scor — mediu ${avgScore}`,
    },
  ] as const

  const cellClass =
    'flex min-h-[48px] flex-1 flex-col justify-center px-5 py-4 outline-none transition-colors duration-200 hover:bg-[var(--gray-50)] focus-visible:z-[1] focus-visible:bg-[var(--gray-50)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cyan)] active:bg-[var(--gray-100)] md:min-h-0 md:px-8 md:py-5'

  return (
    <section
      className="tev-stats-surface w-full border-b border-[var(--gray-200)] py-3 md:py-4"
      aria-label="Indicatori principali"
    >
      <div className="mx-auto max-w-[1100px] px-4 md:px-6">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--gray-200)] bg-[var(--white)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col divide-y divide-[var(--gray-200)] md:flex-row md:divide-y-0 md:divide-x">
            {items.map(m => (
              <Link
                key={m.label}
                href={m.href}
                aria-label={m.aria}
                className={`${cellClass} cursor-pointer touch-manipulation`}
              >
                <div
                  className="font-mono text-[22px] font-bold tabular-nums leading-none md:text-[28px]"
                  style={{ color: m.color }}
                >
                  {m.value}
                </div>
                <div className="mt-2 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-800)] md:text-[13px]">
                  {m.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
