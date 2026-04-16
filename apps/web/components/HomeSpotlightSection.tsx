import Link from 'next/link'
import { displayScore } from '@/lib/score-utils'
import PartyLogo from '@/components/PartyLogo'

export interface SpotlightPolitician {
  id: string
  slug: string
  name: string
  role: string
  party_short: string | null
  score: number | null
  chamber: string
}

export interface SpotlightPromise {
  id: string
  slug: string
  text: string
  status: string
  date_made: string
  politician: { slug: string; name: string; party_short: string | null }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'true':
      return 'Adevărat'
    case 'false':
      return 'Fals'
    case 'partial':
      return 'Parțial'
    default:
      return 'În verificare'
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'true':
      return 'text-[var(--green)]'
    case 'false':
      return 'text-[var(--red)]'
    case 'partial':
      return 'text-[var(--amber)]'
    default:
      return 'text-[var(--gray-500)]'
  }
}

export default function HomeSpotlightSection({
  politicians,
  promises,
}: {
  politicians: SpotlightPolitician[]
  promises: SpotlightPromise[]
}) {
  if (politicians.length === 0 && promises.length === 0) return null

  return (
    <section
      className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]"
      aria-labelledby="spotlight-heading"
    >
      <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-10 md:py-10">
        <h2
          id="spotlight-heading"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-600)]"
        >
          Funcții cheie · promisiuni de impact
        </h2>

        {politicians.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
              Politicieni (președinte / prim-ministru)
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {politicians.map(p => (
                <li key={p.id}>
                  <Link
                    href={`/politician/${p.slug}`}
                    className="flex min-w-[200px] max-w-[280px] flex-col rounded-xl border border-[var(--gray-200)] bg-white px-4 py-3 shadow-sm transition-shadow hover:border-[rgba(29,110,245,0.25)] hover:shadow-md"
                  >
                    <span className="flex items-center gap-2 font-sans text-[14px] font-semibold leading-snug text-[var(--gray-900)]">
                      <PartyLogo partyShort={p.party_short} size={24} className="border border-[var(--gray-200)] bg-white" />
                      {p.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 font-sans text-[12px] text-[var(--gray-500)]">{p.role}</span>
                    <span className="mt-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 uppercase tracking-wide text-[var(--gray-600)]">
                        {p.chamber}
                      </span>
                      <span className="tabular-nums text-[var(--blue)]">{displayScore(p.score)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {promises.length > 0 && (
          <div className={politicians.length > 0 ? 'mt-8' : 'mt-5'}>
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
              Promisiuni (impact ridicat)
            </p>
            <ul className="mt-3 space-y-2">
              {promises.map(r => (
                <li key={r.id}>
                  <Link
                    href={`/audit/${r.id}`}
                    className="flex flex-col gap-1 rounded-xl border border-[var(--gray-200)] bg-white px-4 py-3 shadow-sm transition-shadow hover:border-[rgba(29,110,245,0.25)] hover:shadow-md md:flex-row md:items-start md:justify-between md:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                        {r.politician.name}
                        {r.politician.party_short ? ` · ${r.politician.party_short}` : ''}
                      </span>
                      <p className="mt-1 line-clamp-2 font-sans text-[14px] leading-snug text-[var(--gray-900)]">
                        {r.text}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">
                      <span className={`font-mono text-[11px] font-medium uppercase ${statusClass(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">
                        {new Date(r.date_made).toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
