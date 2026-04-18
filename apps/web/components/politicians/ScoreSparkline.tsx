'use client'

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

export type SparkPoint = { x: string; y: number }

export default function ScoreSparkline({ data, color = '#38bdf8' }: { data: SparkPoint[]; color?: string }) {
  if (data.length === 0) {
    return (
      <div className="flex h-10 w-[88px] items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] font-mono text-[9px] text-white/35">
        —
      </div>
    )
  }

  return (
    <div className="h-10 w-[88px]" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <YAxis domain={[0, 100]} hide width={0} />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
