'use client'

export type SortKey = 'score' | 'falseRecords' | 'name'

import PartyLogo from './PartyLogo'
import { partyLogoSrc } from '@/lib/party-logo'

const SORT_LABELS: Record<SortKey, string> = {
  score: 'Scor',
  falseRecords: 'Promisiuni false',
  name: 'Alfabetic',
}

const PARTY_ACTIVE: Record<string, string> = {
  __all: 'border-[var(--navy)] bg-[var(--navy)] text-white',
  PSD: 'border-[rgba(220,38,38,0.45)] bg-[rgba(220,38,38,0.12)] text-[#b91c1c]',
  PNL: 'border-[rgba(29,110,245,0.45)] bg-[rgba(29,110,245,0.12)] text-[#1d4ed8]',
  USR: 'border-[rgba(22,163,74,0.45)] bg-[rgba(22,163,74,0.12)] text-[#15803d]',
  AUR: 'border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.15)] text-[#b45309]',
  UDMR: 'border-[rgba(126,34,206,0.45)] bg-[rgba(126,34,206,0.12)] text-[#6b21a8]',
}

function partyPillClass(code: string, active: boolean) {
  if (!active)
    return 'border border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-600)] md:hover:border-[var(--gray-200)]'
  return `border ${PARTY_ACTIVE[code] ?? 'border-[var(--blue)] bg-[var(--blue-light)] text-[var(--blue)]'}`
}

interface FilterSearchBarProps {
  query: string
  onQueryChange: (v: string) => void
  parties: string[]
  party: string | null
  onPartyChange: (v: string | null) => void
  sort: SortKey
  onSortChange: (v: SortKey) => void
}

export default function FilterSearchBar({
  query,
  onQueryChange,
  parties,
  party,
  onPartyChange,
  sort,
  onSortChange,
}: FilterSearchBarProps) {
  const pillCodes = ['PSD', 'PNL', 'USR', 'AUR', 'UDMR'] as const
  const extra = parties.filter(p => !pillCodes.includes(p as (typeof pillCodes)[number]))

  return (
    <div
      id="filter"
      className="w-full scroll-mt-24 border-b border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 md:scroll-mt-0 md:px-6 md:py-3"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="relative w-full shrink-0 lg:w-[280px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-500)]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Caută politician..."
            className="min-h-[44px] w-full rounded-lg border border-[var(--gray-200)] bg-white py-2 pl-9 pr-3 font-mono text-[14px] text-[var(--gray-900)] placeholder:text-[var(--gray-500)] transition-[border-color,box-shadow] duration-200 ease-out focus:border-[var(--blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 md:min-h-0 md:text-[13px]"
            autoComplete="off"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar lg:justify-center">
          <button
            type="button"
            onClick={() => onPartyChange(null)}
            className={`cursor-pointer flex-shrink-0 rounded-full px-3 py-2 font-mono text-[10px] uppercase tracking-wide transition-colors duration-200 ease-out md:py-1 ${partyPillClass('__all', party === null)}`}
          >
            Toate
          </button>
          {pillCodes.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => onPartyChange(party === code ? null : code)}
              aria-label={`Filtru partid ${code}`}
              title={code}
              className={`cursor-pointer flex-shrink-0 rounded-full px-2.5 py-2 transition-colors duration-200 ease-out md:py-1 ${partyPillClass(code, party === code)}`}
            >
              {partyLogoSrc(code) ? (
                <span className="flex items-center justify-center">
                  <PartyLogo partyShort={code} size={18} className="border border-[var(--gray-200)] bg-white" />
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wide">{code}</span>
              )}
            </button>
          ))}
          {extra.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => onPartyChange(party === code ? null : code)}
              aria-label={`Filtru partid ${code}`}
              title={code}
              className={`cursor-pointer flex-shrink-0 rounded-full px-2.5 py-2 transition-colors duration-200 ease-out md:py-1 ${partyPillClass(code, party === code)}`}
            >
              {partyLogoSrc(code) ? (
                <span className="flex items-center justify-center">
                  <PartyLogo partyShort={code} size={18} className="border border-[var(--gray-200)] bg-white" />
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wide">{code}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          <label className="sr-only" htmlFor="pol-sort">
            Sortare
          </label>
          <span className="hidden font-mono text-[11px] uppercase tracking-wide text-[var(--gray-500)] lg:inline">
            Sortare:
          </span>
          <select
            id="pol-sort"
            value={sort}
            onChange={e => onSortChange(e.target.value as SortKey)}
            className="min-h-[44px] w-full cursor-pointer rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2 font-mono text-[14px] text-[var(--gray-900)] transition-[border-color,box-shadow] duration-200 ease-out focus:border-[var(--blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 md:min-h-0 md:w-auto md:text-[11px] md:uppercase"
            aria-label="Sortare listă"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
