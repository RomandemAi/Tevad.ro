'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import ScoreSparkline, { type SparkPoint } from './ScoreSparkline'

export type LeaderboardRow = {
  id: string
  slug: string
  name: string
  party_short: string | null
  score: number
  total_records: number
  updated_at: string | null
  counts: { promise: number; statement: number; vote: number }
  spark: SparkPoint[]
}

type RecordFilter = 'all' | 'promise' | 'statement' | 'vote'

function formatUpdated(iso: string | null) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const columnHelper = createColumnHelper<LeaderboardRow>()

export default function PoliticiansLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }])

  const filtered = useMemo(() => {
    if (recordFilter === 'all') return rows
    return rows.filter(r => r.counts[recordFilter] > 0)
  }, [rows, recordFilter])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'rank',
        header: '#',
        cell: ctx => (
          <span className="font-mono text-[11px] tabular-nums text-white/45">{ctx.row.index + 1}</span>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Politician',
        cell: info => (
          <Link
            href={`/politician/${info.row.original.slug}`}
            className="group font-sans text-[14px] font-medium text-white transition-colors hover:text-[var(--cyan)]"
          >
            <span className="border-b border-transparent group-hover:border-[var(--cyan)]">{info.getValue()}</span>
          </Link>
        ),
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('party_short', {
        header: 'Partid',
        cell: info => (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/70">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      columnHelper.accessor('score', {
        header: 'Scor',
        cell: info => (
          <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--cyan)]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('total_records', {
        header: 'Înregistrări',
        cell: info => (
          <span className="font-mono text-[13px] tabular-nums text-white/80">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: 'mix',
        header: 'P / D / V',
        cell: info => {
          const c = info.row.original.counts
          return (
            <span className="whitespace-nowrap font-mono text-[10px] tabular-nums text-white/55">
              {c.promise} · {c.statement} · {c.vote}
            </span>
          )
        },
      }),
      columnHelper.accessor('updated_at', {
        header: 'Actualizat',
        cell: info => (
          <span className="font-mono text-[10px] leading-snug text-white/45">{formatUpdated(info.getValue())}</span>
        ),
        sortingFn: (a, b, id) => {
          const va = a.getValue(id) as string | null
          const vb = b.getValue(id) as string | null
          if (!va && !vb) return 0
          if (!va) return 1
          if (!vb) return -1
          return va.localeCompare(vb)
        },
      }),
      columnHelper.display({
        id: 'spark',
        header: 'Istoric scor',
        cell: info => <ScoreSparkline data={info.row.original.spark} />,
        enableSorting: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const filterBtn = (id: RecordFilter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setRecordFilter(id)}
      className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ${
        recordFilter === id
          ? 'bg-gradient-to-r from-[#1d6ef5]/90 to-[#0ea5e9]/80 text-white shadow-[0_0_20px_rgba(14,165,233,0.25)]'
          : 'border border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white/85'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white md:text-3xl">Leaderboard</h1>
          <p className="mt-1 max-w-xl font-sans text-[13px] leading-relaxed text-white/50">
            Scor de credibilitate, număr de înregistrări și evoluție recentă — filtrează după tipul de conținut urmărit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterBtn('all', 'Toți')}
          {filterBtn('promise', 'Promisiuni')}
          {filterBtn('statement', 'Declarații')}
          {filterBtn('vote', 'Voturi')}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#0c1428] via-[#0a1020] to-[#060b14] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-white/[0.08] bg-white/[0.03]">
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 select-none text-white/55 transition-colors hover:text-white"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[h.column.getIsSorted() as string] ?? null}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] transition-colors duration-150 hover:bg-white/[0.04]"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center font-mono text-[12px] text-white/40">
            Niciun politician nu îndeplinește filtrul curent.
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] text-white/35">
        Mini-grafice: ultimele puncte din istoricul scorului (max. 24 evenimente). Datele provin din `score_history`.
      </p>
    </div>
  )
}
