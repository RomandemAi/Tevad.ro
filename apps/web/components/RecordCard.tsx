'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Source {
  id: string
  tier: string
  outlet: string
  url: string
  archived_url?: string
  published_at?: string
}

interface PoliticianRecord {
  id: string
  type: 'promise' | 'statement' | 'vote'
  text: string
  status: 'true' | 'false' | 'partial' | 'pending'
  date_made: string
  impact_level: string
  likes: number
  dislikes: number
  ai_confidence?: number
  sources: Source[]
}

const STATUS_LABEL: Record<string, string> = {
  true: 'ADEVĂRAT',
  false: 'FALS',
  partial: 'PARȚIAL',
  pending: 'PENDING',
}

const STATUS_CLASS: Record<string, string> = {
  true: 'bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.35)]',
  false: 'bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.35)]',
  partial: 'bg-[var(--amber-bg)] text-[var(--amber)] border-[rgba(217,119,6,0.35)]',
  pending: 'bg-[var(--slate-bg)] text-[var(--slate)] border-[var(--gray-200)]',
}

const BORDER_COLOR: Record<string, string> = {
  true: 'var(--green)',
  false: 'var(--red)',
  partial: 'var(--amber)',
  pending: 'var(--slate)',
}

const TYPE_LABEL: Record<string, string> = {
  promise: 'PROMISIUNE',
  statement: 'DECLARAȚIE',
  vote: 'VOT',
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))
const TRUNCATE_AT = 200

function IconThumbUp({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 009.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0016.56 8H13V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L7.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  )
}

function IconThumbDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zm-4 .167v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0010.057 2H4.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 003.44 12H7v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
    </svg>
  )
}

export default function RecordCard({ record, politicianId: _politicianId }: { record: PoliticianRecord; politicianId: string }) {
  const [likes, setLikes] = useState(record.likes)
  const [dislikes, setDislikes] = useState(record.dislikes)
  const [userReact, setUserReact] = useState<'like' | 'dislike' | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const shouldTruncate = record.text.length > TRUNCATE_AT

  async function react(type: 'like' | 'dislike') {
    if (loading) return
    setLoading(true)
    const prev = userReact
    if (prev === type) {
      setUserReact(null)
      type === 'like' ? setLikes(l => l - 1) : setDislikes(d => d - 1)
    } else {
      if (prev === 'like') setLikes(l => l - 1)
      if (prev === 'dislike') setDislikes(d => d - 1)
      setUserReact(type)
      type === 'like' ? setLikes(l => l + 1) : setDislikes(d => d + 1)
    }
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, type }),
      })
    } catch {
      setLikes(record.likes)
      setDislikes(record.dislikes)
      setUserReact(prev)
    } finally {
      setLoading(false)
    }
  }

  const primary = record.sources?.[0]

  return (
    <div
      className="relative mb-4 rounded-xl border border-[var(--gray-200)] border-l-[3px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors md:p-5 md:hover:border-[var(--gray-200)] md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ borderLeftColor: BORDER_COLOR[record.status] }}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-wide ${STATUS_CLASS[record.status]}`}
        >
          {STATUS_LABEL[record.status]}
        </span>
        <span className="inline-flex items-center rounded-full border border-[var(--gray-200)] bg-white px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-[var(--gray-600)]">
          {TYPE_LABEL[record.type]}
        </span>
        {record.impact_level === 'high' && (
          <span className="inline-flex items-center rounded-full border border-[rgba(217,119,6,0.35)] bg-[var(--amber-bg)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--amber)]">
            Impact major
          </span>
        )}
        {record.ai_confidence !== undefined && (
          <span className="ml-auto font-mono text-[10px] text-[var(--gray-500)] md:text-[10px]">
            AI {record.ai_confidence}%
          </span>
        )}
      </div>

      <p
        className={`font-sans text-[14px] italic leading-[1.6] text-[var(--gray-700)] md:text-[14px] ${
          !expanded && shouldTruncate ? 'line-clamp-3' : ''
        }`}
      >
        {record.text}
      </p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-2 min-h-[44px] cursor-pointer rounded font-mono text-[11px] text-[var(--blue)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 md:min-h-0"
        >
          {expanded ? '↑ Mai puțin' : '↓ Arată mai mult'}
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--gray-100)] pt-3">
        {primary ? (
          <a
            href={primary.archived_url ?? primary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 font-mono text-[11px] text-[var(--blue)] md:min-h-0"
          >
            {primary.outlet}
            <svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path d="M1 10L10 1M10 1H4M10 1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </a>
        ) : (
          <span className="font-mono text-[11px] text-[var(--gray-500)]">Fără sursă publică</span>
        )}
        <span className="font-mono text-[11px] text-[var(--gray-500)]">
          {new Date(record.date_made).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--gray-100)] pt-3">
        <button
          type="button"
          onClick={() => react('like')}
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 font-mono text-[11px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 md:min-h-0 md:py-1.5 ${
            userReact === 'like'
              ? 'border-[rgba(22,163,74,0.45)] bg-[var(--green-bg)] text-[var(--green)]'
              : 'border-[var(--gray-200)] text-[var(--gray-500)] active:bg-[var(--gray-50)] md:hover:border-[var(--gray-200)]'
          }`}
        >
          <IconThumbUp className="opacity-80" />
          {fmt(likes)}
        </button>
        <button
          type="button"
          onClick={() => react('dislike')}
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 font-mono text-[11px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--red)] focus-visible:ring-offset-2 md:min-h-0 md:py-1.5 ${
            userReact === 'dislike'
              ? 'border-[rgba(220,38,38,0.45)] bg-[var(--red-bg)] text-[var(--red)]'
              : 'border-[var(--gray-200)] text-[var(--gray-500)] active:bg-[var(--gray-50)] md:hover:border-[var(--gray-200)]'
          }`}
        >
          <IconThumbDown className="opacity-80" />
          {fmt(dislikes)}
        </button>

        <Link
          href={`/audit/${record.id}`}
          className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-[var(--blue)] px-3 py-2 font-mono text-[11px] text-[var(--blue)] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 md:min-h-0 md:py-1.5"
          onClick={e => e.stopPropagation()}
        >
          Surse complete →
        </Link>
      </div>
    </div>
  )
}
