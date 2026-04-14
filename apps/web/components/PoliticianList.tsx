'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import FilterSearchBar, { type SortKey } from './FilterSearchBar'
import PoliticianCard from './PoliticianCard'
import type { Politician } from './politician-types'
import { dedupePoliticiansByNameIdentity } from '@/lib/dedupe-politicians'
import { displayScore } from '@/lib/score-utils'

export type { Politician } from './politician-types'

interface PoliticianListProps {
  politicians: Politician[]
}

function mergePoliticianRow(prev: Politician, incoming: Record<string, unknown>): Politician {
  return {
    ...prev,
    ...incoming,
    id: (incoming.id as string) ?? prev.id,
    slug: (incoming.slug as string) ?? prev.slug,
    name: (incoming.name as string) ?? prev.name,
    role: (incoming.role as string) ?? prev.role,
    party: (incoming.party as string) ?? prev.party,
    party_short: (incoming.party_short as string) ?? prev.party_short,
    chamber: (incoming.chamber as string) ?? prev.chamber,
    score: typeof incoming.score === 'number' ? incoming.score : prev.score,
    total_records:
      typeof incoming.total_records === 'number' ? incoming.total_records : prev.total_records,
    records_true:
      typeof incoming.records_true === 'number' ? incoming.records_true : prev.records_true,
    records_false:
      typeof incoming.records_false === 'number' ? incoming.records_false : prev.records_false,
    records_partial:
      typeof incoming.records_partial === 'number' ? incoming.records_partial : prev.records_partial,
    records_pending:
      typeof incoming.records_pending === 'number' ? incoming.records_pending : prev.records_pending,
    avatar_color: (incoming.avatar_color as string | null) ?? prev.avatar_color,
    avatar_text_color: (incoming.avatar_text_color as string | null) ?? prev.avatar_text_color,
    avatar_url: (incoming.avatar_url as string | null | undefined) ?? prev.avatar_url,
    score_promises:
      typeof incoming.score_promises === 'number' ? incoming.score_promises : prev.score_promises,
    score_reactions:
      typeof incoming.score_reactions === 'number' ? incoming.score_reactions : prev.score_reactions,
    score_sources:
      typeof incoming.score_sources === 'number' ? incoming.score_sources : prev.score_sources,
    score_consistency:
      typeof incoming.score_consistency === 'number'
        ? incoming.score_consistency
        : prev.score_consistency,
  }
}

export default function PoliticianList({ politicians }: PoliticianListProps) {
  const [query, setQuery] = useState('')
  const [party, setParty] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('score')
  const [rows, setRows] = useState<Politician[]>(politicians)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [badgeIds, setBadgeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRows(dedupePoliticiansByNameIdentity(politicians))
  }, [politicians])

  const applySort = useCallback(
    (list: Politician[]) => {
      const sc = (p: Politician) => displayScore(p.score)
      const rf = (p: Politician) => Number(p.records_false ?? 0)
      if (sort === 'score') return [...list].sort((a, b) => sc(b) - sc(a))
      if (sort === 'falseRecords') return [...list].sort((a, b) => rf(b) - rf(a))
      return [...list].sort((a, b) => a.name.localeCompare(b.name))
    },
    [sort]
  )

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null
    try {
      supabase = createClient()
    } catch {
      return
    }

    const channel = supabase
      .channel('politicians-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'politicians', filter: 'is_active=eq.true' },
        payload => {
          const id = (payload.new as { id?: string }).id
          if (!id) return
          setRows(prev => {
            const next = prev.map(p =>
              p.id === id ? mergePoliticianRow(p, payload.new as Record<string, unknown>) : p
            )
            return applySort(dedupePoliticiansByNameIdentity(next))
          })
          setFlashIds(s => new Set(s).add(id))
          setBadgeIds(s => new Set(s).add(id))
          window.setTimeout(() => {
            setFlashIds(s => {
              const n = new Set(s)
              n.delete(id)
              return n
            })
          }, 1000)
          window.setTimeout(() => {
            setBadgeIds(s => {
              const n = new Set(s)
              n.delete(id)
              return n
            })
          }, 3000)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [applySort])

  const parties = useMemo(() => {
    const seen = new Set<string>()
    for (const p of rows) if (p.party_short) seen.add(p.party_short)
    return Array.from(seen).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (query) list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    if (party) list = list.filter(p => p.party_short === party)
    return applySort(list)
  }, [rows, query, party, applySort])

  return (
    <div id="clasament" className="flex min-h-0 flex-1 flex-col scroll-mt-20 md:scroll-mt-0">
      <FilterSearchBar
        query={query}
        onQueryChange={setQuery}
        parties={parties}
        party={party}
        onPartyChange={setParty}
        sort={sort}
        onSortChange={setSort}
      />

      <div className="tev-page-fill flex-1 px-4 py-4 md:px-6 md:py-5">
        <div className="mx-auto w-full max-w-[1200px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--gray-200)] bg-white py-16 font-mono shadow-sm">
              <span className="text-[13px] text-[var(--gray-500)]">Niciun rezultat</span>
              {query && (
                <span className="text-[12px] text-[var(--gray-500)] opacity-70">pentru „{query}”</span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {filtered.map((pol, i) => (
                <PoliticianCard
                  key={pol.id}
                  pol={pol}
                  rank={i + 1}
                  flash={flashIds.has(pol.id)}
                  showLive={badgeIds.has(pol.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
