'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type ScoreHistoryPoint = { recorded_at: string; score_new: number }

function formatRoDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function ScoreHistoryLineChart({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] font-mono text-[12px] text-[var(--gray-500)]">
        Încă nu există istoric de scor în baza de date.
      </div>
    )
  }

  const data = points.map(p => ({
    t: p.recorded_at,
    label: formatRoDate(p.recorded_at),
    score: p.score_new,
  }))

  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--gray-500)' }}
            axisLine={{ stroke: 'var(--gray-200)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            width={36}
            tick={{ fontSize: 10, fill: 'var(--gray-500)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--gray-200)',
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v}`, 'Scor']}
            labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--blue)"
            strokeWidth={2.25}
            dot={{ r: 3, fill: 'var(--blue)', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
