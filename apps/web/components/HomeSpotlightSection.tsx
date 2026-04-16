import Link from 'next/link'
import { displayScore } from '@/lib/score-utils'
import PoliticianAvatar from '@/components/PoliticianAvatar'

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

function chamberSpotlightLabel(chamber: string): string {
  switch (chamber) {
    case 'president':
      return 'Președinte'
    case 'premier':
      return 'Prim-ministru'
    case 'minister':
    case 'ministru':
      return 'Guvern'
    default:
      return chamber
  }
}

/** Neutral „palat / clădire publică” — not a party mark. */
function InstitutionBuildingIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M28 6L8 20v30h40V20L28 6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className="text-[var(--gray-400)]"
      />
      <path d="M14 34h8v16h-8V34zm12 0h8v16h-8V34zm12 0h8v16h-8V34z" fill="currentColor" className="text-[var(--gray-300)]" />
      <path d="M22 22h4v6h-4v-6zm8 0h4v6h-4v-6z" fill="currentColor" className="text-[var(--gray-300)]" />
      <circle cx="28" cy="14" r="2" fill="currentColor" className="text-[var(--gray-400)]" />
    </svg>
  )
}

function SpotlightPersonCard({
  p,
  variant,
}: {
  p: SpotlightPolitician
  variant: 'hero' | 'lead' | 'compact'
}) {
  const isHero = variant === 'hero'
  const isLead = variant === 'lead'
  const nameCls = isHero
    ? 'font-sans text-[17px] font-bold leading-snug text-[var(--gray-900)] md:text-[20px]'
    : isLead
      ? 'font-sans text-[15px] font-semibold leading-snug text-[var(--gray-900)] md:text-[16px]'
      : 'font-sans text-[13px] font-semibold leading-snug text-[var(--gray-900)] md:text-[14px]'
  const roleCls = isHero
    ? 'mt-1 line-clamp-2 font-sans text-[13px] text-[var(--gray-600)] md:text-[14px]'
    : 'mt-0.5 line-clamp-2 font-sans text-[11px] text-[var(--gray-500)] md:text-[12px]'
  const pad = isHero ? 'p-5 md:p-6' : isLead ? 'p-4 md:p-5' : 'p-3 md:p-4'
  const avatarSize = isHero ? 'xl' : isLead ? 'md' : 'sm'

  return (
    <Link
      href={`/politician/${p.slug}`}
      className={`group flex flex-col rounded-2xl border border-[var(--gray-200)] bg-white shadow-sm transition-[border-color,box-shadow] duration-[var(--duration-2)] ease-[var(--ease-out)] hover:border-[rgba(29,110,245,0.28)] hover:shadow-md ${pad} ${
        isHero ? 'mx-auto w-full max-w-3xl min-h-[132px] md:min-h-[156px]' : ''
      }`}
    >
      <div className={`flex ${isHero ? 'flex-col items-center gap-4 sm:flex-row sm:items-start' : 'flex-row items-start gap-3'}`}>
        <PoliticianAvatar
          name={p.name}
          partyShort={p.party_short}
          size={avatarSize as 'sm' | 'md' | 'lg' | 'xl'}
          shape="circle"
          className={`shrink-0 ${isHero ? 'ring-2 ring-[rgba(15,31,61,0.08)]' : ''}`}
        />
        <div className={`min-w-0 flex-1 ${isHero ? 'text-center sm:text-left' : ''}`}>
          <span className={nameCls}>{p.name}</span>
          <p className={roleCls}>{p.role}</p>
          <span className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] md:text-[11px]">
            <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 uppercase tracking-wide text-[var(--gray-600)]">
              {chamberSpotlightLabel(p.chamber)}
            </span>
            <span className="tabular-nums text-[var(--blue)]">{displayScore(p.score)}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function HomeSpotlightSection({
  politicians,
  promises,
}: {
  politicians: SpotlightPolitician[]
  promises: SpotlightPromise[]
}) {
  if (politicians.length === 0 && promises.length === 0) return null

  const hero = politicians[0]
  const rest = politicians.slice(1)

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
          <div className="mt-6">
            <div className="flex flex-col items-center gap-2 border-b border-[var(--gray-200)] pb-5 text-center sm:flex-row sm:items-start sm:gap-4 sm:border-b-0 sm:pb-0 sm:text-left">
              <InstitutionBuildingIcon className="h-14 w-14 shrink-0 opacity-90" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gray-500)]">
                  Funcții executive în stat
                </p>
                <p className="mt-1 max-w-[52ch] font-sans text-[13px] leading-snug text-[var(--gray-600)]">
                  Președinte (evidențiat), prim-ministru și până la trei membri ai guvernului — aceeași transparență ca
                  pentru deputați și senatori.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {hero ? (
                <div className="w-full">
                  <SpotlightPersonCard p={hero} variant="hero" />
                </div>
              ) : null}

              {rest.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {rest.map(p => (
                    <SpotlightPersonCard
                      key={p.id}
                      p={p}
                      variant={p.chamber === 'premier' ? 'lead' : 'compact'}
                    />
                  ))}
                </div>
              ) : null}
            </div>
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
