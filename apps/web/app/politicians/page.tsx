import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import PoliticiansLeaderboard, { type LeaderboardRow } from '@/components/politicians/PoliticiansLeaderboard'
import type { SparkPoint } from '@/components/politicians/ScoreSparkline'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Leaderboard — Tevad.org',
  description: 'Clasament politicieni după scor de credibilitate, înregistrări și evoluție recentă.',
}

type PolRow = {
  id: string
  slug: string
  name: string
  party_short: string | null
  score: number
  total_records: number | null
  updated_at: string | null
}

type RecTypeRow = { politician_id: string; type: string }
type HistRow = { politician_id: string; score_new: number; recorded_at: string }

function buildCounts(records: RecTypeRow[]) {
  const m = new Map<string, { promise: number; statement: number; vote: number }>()
  for (const r of records) {
    if (!m.has(r.politician_id)) {
      m.set(r.politician_id, { promise: 0, statement: 0, vote: 0 })
    }
    const c = m.get(r.politician_id)!
    if (r.type === 'promise') c.promise += 1
    else if (r.type === 'statement') c.statement += 1
    else if (r.type === 'vote') c.vote += 1
  }
  return m
}

function buildSparkMap(history: HistRow[]): Map<string, SparkPoint[]> {
  const m = new Map<string, HistRow[]>()
  for (const h of history) {
    if (!m.has(h.politician_id)) m.set(h.politician_id, [])
    m.get(h.politician_id)!.push(h)
  }
  const sparks = new Map<string, SparkPoint[]>()
  for (const [id, arr] of Array.from(m.entries())) {
    arr.sort((a: HistRow, b: HistRow) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    const last = arr.slice(-24)
    sparks.set(
      id,
      last.map((p: HistRow) => ({ x: p.recorded_at, y: p.score_new }))
    )
  }
  return sparks
}

export default async function PoliticiansPage() {
  const supabase = createClient()

  const { data: pols, error } = await supabase
    .from('politicians')
    .select('id, slug, name, party_short, score, total_records, updated_at')
    .eq('is_active', true)
    .order('score', { ascending: false })

  if (error) {
    return (
      <AppShell
        breadcrumb={
          <>
            <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
              POLITICIENI
            </Link>
            <span className="text-[var(--gray-500)]"> / </span>
            <span className="text-[var(--gray-500)]">LEADERBOARD</span>
          </>
        }
      >
        <div className="tev-page-fill flex flex-1 items-center justify-center px-4">
          <p className="font-mono text-[13px] text-[var(--red)]">Nu s-au putut încărca datele: {error.message}</p>
        </div>
      </AppShell>
    )
  }

  const list = (pols ?? []) as PolRow[]
  const ids = list.map(p => p.id)

  let recRows: RecTypeRow[] = []
  let histRows: HistRow[] = []

  if (ids.length > 0) {
    const [recRes, histRes] = await Promise.all([
      supabase.from('records').select('politician_id, type').in('politician_id', ids),
      supabase
        .from('score_history')
        .select('politician_id, score_new, recorded_at')
        .in('politician_id', ids)
        .order('recorded_at', { ascending: false })
        .limit(5000),
    ])
    if (recRes.error) console.error('[politicians] records:', recRes.error.message)
    if (histRes.error) console.error('[politicians] score_history:', histRes.error.message)
    recRows = (recRes.data ?? []) as RecTypeRow[]
    histRows = (histRes.data ?? []) as HistRow[]
  }

  const countMap = buildCounts(recRows)
  const sparkMap = buildSparkMap(histRows)

  const rows: LeaderboardRow[] = list.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    party_short: p.party_short,
    score: p.score,
    total_records: p.total_records ?? 0,
    updated_at: p.updated_at,
    counts: countMap.get(p.id) ?? { promise: 0, statement: 0, vote: 0 },
    spark: sparkMap.get(p.id) ?? [],
  }))

  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">LEADERBOARD</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="min-h-full bg-[#060910] pb-20 pt-6 md:pt-10">
        <div className="mx-auto max-w-[1120px] px-4 md:px-6">
          <PoliticiansLeaderboard rows={rows} />
        </div>
      </div>
    </AppShell>
  )
}
