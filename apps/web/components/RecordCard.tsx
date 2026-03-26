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

interface Record {
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
  true:    'bg-[rgba(34,201,122,0.1)] text-[var(--green)] border-[rgba(34,201,122,0.3)]',
  false:   'bg-[rgba(240,69,69,0.1)] text-[var(--red)] border-[rgba(240,69,69,0.3)]',
  partial: 'bg-[rgba(245,166,35,0.1)] text-[var(--amber)] border-[rgba(245,166,35,0.3)]',
  pending: 'bg-[rgba(122,148,184,0.08)] text-[var(--text3)] border-[var(--border)]',
}

const BORDER_COLOR: Record<string, string> = {
  true:    'var(--green)',
  false:   'var(--red)',
  partial: 'var(--amber)',
  pending: 'var(--text3)',
}

const TYPE_LABEL: Record<string, string> = {
  promise: 'PROMISIUNE',
  statement: 'DECLARAȚIE',
  vote: 'VOT',
}

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
const TRUNCATE_AT = 200

export default function RecordCard({ record, politicianId }: { record: Record; politicianId: string }) {
  const [likes, setLikes]         = useState(record.likes)
  const [dislikes, setDislikes]   = useState(record.dislikes)
  const [userReact, setUserReact] = useState<'like' | 'dislike' | null>(null)
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState(false)

  const shouldTruncate = record.text.length > TRUNCATE_AT

  async function react(type: 'like' | 'dislike') {
    if (loading) return
    setLoading(true)
    const prev = userReact
    if (prev === type) {
      setUserReact(null)
      type === 'like' ? setLikes(l => l - 1) : setDislikes(d => d - 1)
    } else {
      if (prev === 'like')    setLikes(l => l - 1)
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

  return (
    <div
      className="border border-l-2 rounded-lg p-3 mb-3 transition-all duration-150 hover:border-[var(--border2)] bg-[var(--bg)]"
      style={{ borderLeftColor: BORDER_COLOR[record.status], borderColor: `var(--border)`, borderLeftWidth: '2px' }}
    >
      {/* Zone 1 — Header */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm border font-medium ${STATUS_CLASS[record.status]}`}>
          {STATUS_LABEL[record.status]}
        </span>
        <span className="font-mono text-[8px] text-[var(--text3)] px-1.5 py-0.5 border border-[var(--border)] rounded-sm bg-[var(--surface)]">
          {TYPE_LABEL[record.type]}
        </span>
        {record.impact_level === 'high' && (
          <span className="font-mono text-[8px] text-[var(--amber)] px-1.5 py-0.5 border border-[rgba(245,166,35,0.3)] rounded-sm bg-[rgba(245,166,35,0.08)]">
            IMPACT MAJOR
          </span>
        )}
        <span className="font-mono text-[9px] text-[var(--text3)] ml-auto">
          {new Date(record.date_made).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }).toUpperCase()}
        </span>
        {record.ai_confidence !== undefined && (
          <span className="font-mono text-[8px] text-[var(--text3)]">
            AI {record.ai_confidence}%
          </span>
        )}
      </div>

      {/* Zone 2 — Text */}
      <p className={`text-[13px] text-[var(--text2)] leading-[1.6] mb-2.5 ${!expanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
        {record.text}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="font-mono text-[9px] text-[var(--accent2)] hover:opacity-80 mb-2.5 transition-opacity"
        >
          {expanded ? '↑ Mai puțin' : '↓ Arată mai mult'}
        </button>
      )}

      {/* Zone 3 — Sources */}
      {record.sources && record.sources.length > 0 && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-0">
          {record.sources.slice(0, 3).map(src => (
            <a
              key={src.id}
              href={src.archived_url ?? src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[9px] text-[var(--accent2)] opacity-75 hover:opacity-100 transition-opacity"
            >
              <svg width="8" height="8" viewBox="0 0 11 11" fill="none">
                <path d="M1 10L10 1M10 1H4M10 1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {src.outlet}
              <span className="text-[var(--text3)]">[T{src.tier}]</span>
            </a>
          ))}
          {record.sources.length > 3 && (
            <span className="font-mono text-[9px] text-[var(--text3)]">
              +{record.sources.length - 3} surse
            </span>
          )}
        </div>
      )}

      {/* Zone 4 — Reactions + Audit */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
        <button
          onClick={() => react('like')}
          className={`flex items-center gap-1 px-2.5 py-1 border rounded font-mono text-[10px] transition-all ${
            userReact === 'like'
              ? 'bg-[rgba(34,201,122,0.08)] border-[rgba(34,201,122,0.3)] text-[var(--green)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 009.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0016.56 8H13V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L7.8 7.933a4 4 0 00-.8 2.4z"/>
          </svg>
          {fmt(likes)}
        </button>
        <button
          onClick={() => react('dislike')}
          className={`flex items-center gap-1 px-2.5 py-1 border rounded font-mono text-[10px] transition-all ${
            userReact === 'dislike'
              ? 'bg-[rgba(240,69,69,0.08)] border-[rgba(240,69,69,0.3)] text-[var(--red)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zm-4 .167v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0010.057 2H4.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 003.44 12H7v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z"/>
          </svg>
          {fmt(dislikes)}
        </button>

        {/* Audit link */}
        <Link
          href={`/audit/${record.id}`}
          className="flex items-center gap-1 font-mono text-[9px] text-[var(--text3)] hover:text-[var(--accent2)] transition-colors ml-auto"
          onClick={e => e.stopPropagation()}
        >
          <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          Audit
        </Link>
      </div>
    </div>
  )
}
