'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { scoreColor } from '@/lib/score-utils'
import PoliticianAvatar from './PoliticianAvatar'
import ScoreBar from './ScoreBar'

interface Politician {
  id: string
  slug: string
  name: string
  role: string
  party: string
  party_short: string
  chamber: string
  score: number
  total_records: number
  records_true: number
  records_false: number
  records_partial: number
  records_pending: number
  avatar_color: string | null
  avatar_text_color: string | null
}

type SortKey = 'score' | 'records' | 'name'

interface PoliticianListProps {
  politicians: Politician[]
}

export default function PoliticianList({ politicians }: PoliticianListProps) {
  const [query, setQuery]   = useState('')
  const [party, setParty]   = useState<string | null>(null)
  const [sort, setSort]     = useState<SortKey>('score')

  const parties = useMemo(() => {
    const seen = new Set<string>()
    for (const p of politicians) if (p.party_short) seen.add(p.party_short)
    return [...seen].sort()
  }, [politicians])

  const filtered = useMemo(() => {
    let list = politicians
    if (query)  list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    if (party)  list = list.filter(p => p.party_short === party)
    if (sort === 'score')   list = [...list].sort((a, b) => b.score - a.score)
    if (sort === 'records') list = [...list].sort((a, b) => (b.total_records ?? 0) - (a.total_records ?? 0))
    if (sort === 'name')    list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [politicians, query, party, sort])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Controls */}
      <div className="px-5 py-3 border-b border-[var(--border)] space-y-2.5 bg-[var(--bg)]">
        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Caută politician..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 font-mono text-[11px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--border2)] transition-colors"
            />
          </div>
          {/* Sort segmented */}
          <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden flex-shrink-0">
            {(['score', 'records', 'name'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`font-mono text-[9px] px-2.5 py-1.5 uppercase tracking-wide transition-colors ${
                  sort === key
                    ? 'bg-[var(--surface2)] text-[var(--text2)]'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {key === 'score' ? 'Scor' : key === 'records' ? 'Înreg.' : 'Nume'}
              </button>
            ))}
          </div>
        </div>

        {/* Party pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setParty(null)}
            className={`font-mono text-[9px] uppercase px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors ${
              party === null
                ? 'border-[var(--accent)] text-[var(--accent2)] bg-[rgba(29,110,245,0.1)]'
                : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
            }`}
          >
            Toate
          </button>
          {parties.map(p => (
            <button
              key={p}
              onClick={() => setParty(party === p ? null : p)}
              className={`font-mono text-[9px] uppercase px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors ${
                party === p
                  ? 'border-[var(--accent)] text-[var(--accent2)] bg-[rgba(29,110,245,0.1)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-16 font-mono">
            <span className="text-[var(--text3)] text-[11px]">NICIUN REZULTAT</span>
            {query && (
              <span className="text-[var(--text3)] text-[9px] opacity-60">
                pentru "{query}"
              </span>
            )}
          </div>
        ) : (
          filtered.map((pol, i) => {
            const total = pol.total_records ?? 0
            const trueW  = total > 0 ? (pol.records_true    ?? 0) / total * 100 : 0
            const falseW = total > 0 ? (pol.records_false   ?? 0) / total * 100 : 0
            const partW  = total > 0 ? (pol.records_partial ?? 0) / total * 100 : 0

            return (
              <Link
                key={pol.id}
                href={`/politician/${pol.slug}`}
                className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group relative animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-[var(--border2)] transition-colors" />

                {/* Rank */}
                <span className="font-mono text-[10px] text-[var(--text3)] w-5 text-right flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <PoliticianAvatar
                  name={pol.name}
                  avatarColor={pol.avatar_color}
                  avatarTextColor={pol.avatar_text_color}
                  size="sm"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[var(--text)] mb-0.5 truncate">
                    {pol.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--text3)] truncate">
                      {pol.role}
                    </span>
                    <span
                      className="font-mono text-[8px] flex-shrink-0"
                      style={{ color: pol.avatar_text_color ?? 'var(--accent2)' }}
                    >
                      {pol.party_short}
                    </span>
                  </div>

                  {/* Record mix bar */}
                  {total > 0 && (
                    <div className="flex h-[2px] w-full rounded-full overflow-hidden mt-1.5 gap-px">
                      <div style={{ width: `${trueW}%`,  background: 'var(--green)' }} />
                      <div style={{ width: `${falseW}%`, background: 'var(--red)' }} />
                      <div style={{ width: `${partW}%`,  background: 'var(--amber)' }} />
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className="font-mono text-base font-medium tabular-nums"
                    style={{ color: scoreColor(pol.score) }}
                  >
                    {pol.score}
                  </span>
                  <ScoreBar value={pol.score} width="w-14" glow />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
