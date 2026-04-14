'use client'

import Link from 'next/link'
import { displayScore, scoreColor } from '@/lib/score-utils'
import PoliticianAvatar from './PoliticianAvatar'
import type { Politician } from './politician-types'

function chamberLabel(ch: string) {
  if (!ch) return '—'
  return ch.charAt(0).toUpperCase() + ch.slice(1)
}

interface PoliticianCardProps {
  pol: Politician
  rank: number
  flash: boolean
  showLive: boolean
}

export default function PoliticianCard({ pol, rank, flash, showLive }: PoliticianCardProps) {
  const score = displayScore(pol.score)
  const col = scoreColor(score)
  const ring =
    pol.avatar_text_color != null && pol.avatar_text_color !== ''
      ? `color-mix(in srgb, ${pol.avatar_text_color} 30%, transparent)`
      : 'rgba(29, 110, 245, 0.35)'

  return (
    <Link
      href={`/politician/${pol.slug}`}
      title={`${pol.name} — ${pol.role}`}
      className={`te-politician-card tev-card-surface group relative block cursor-pointer p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-white md:p-5 md:hover:-translate-y-0.5 active:scale-[0.99] motion-reduce:md:hover:translate-y-0 ${
        flash ? 'tev-card-flash' : ''
      }`}
      style={{ animationDelay: '0s' }}
    >
      {showLive && (
        <span className="absolute right-3 top-3 rounded bg-[var(--green)] px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-wide text-white">
          Live
        </span>
      )}

      <div className="flex items-start gap-3">
        <span className="hidden w-6 flex-shrink-0 pt-1 text-right font-mono text-[11px] text-[#94a3b8] md:block">
          {String(rank).padStart(2, '0')}
        </span>

        <PoliticianAvatar
          name={pol.name}
          avatarColor={pol.avatar_color}
          avatarTextColor={pol.avatar_text_color}
          avatarUrl={pol.avatar_url}
          partyShort={pol.party_short}
          size="card"
          shape="circle"
          ringColor={ring}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-2 break-words font-sans text-[15px] font-semibold leading-snug text-[var(--gray-900)] md:text-[16px]">
                {pol.name}
              </div>
              <div className="mt-0.5 line-clamp-2 break-words font-sans text-[12px] leading-snug text-[var(--gray-500)] md:text-[13px]">
                {pol.role}
                {pol.party_short ? (
                  <span className="text-[var(--gray-400)]"> · {pol.party_short}</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <span
                className={`font-mono text-[24px] font-medium tabular-nums leading-none md:text-[28px] ${flash ? 'score-flash-anim' : ''}`}
                style={{ color: col }}
              >
                {score}
              </span>
              <div
                className="h-1 w-12 overflow-hidden rounded-full bg-[var(--gray-200)] md:w-[48px]"
                aria-hidden
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: col }}
                />
              </div>
            </div>
          </div>

          <div className="my-3 h-px bg-[var(--gray-100)]" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hidden flex-wrap items-center gap-3 font-mono text-[11px] md:flex">
              <span className="text-[var(--green)]">✓ {pol.records_true ?? 0} ținute</span>
              <span className="text-[var(--red)]">✗ {pol.records_false ?? 0} false</span>
              <span className="text-[var(--gray-500)]">◷ {pol.records_pending ?? 0} pending</span>
            </div>
            <div className="flex font-mono text-[11px] text-[var(--red)] md:hidden">
              ✗ {pol.records_false ?? 0} false
            </div>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <span className="rounded-full bg-[var(--gray-100)] px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[var(--gray-600)]">
                {chamberLabel(pol.chamber)}
              </span>
              <svg
                className="h-4 w-4 text-[var(--gray-300)] transition-transform md:group-hover:translate-x-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
