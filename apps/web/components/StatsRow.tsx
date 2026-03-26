'use client'

import { useEffect, useRef, useState } from 'react'
import { scoreColor } from '@/lib/score-utils'

interface StatCardProps {
  value: number
  label: string
  color: string
  pulse?: boolean
  prefix?: string
}

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  const frame = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(eased * target))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])
  return val
}

function StatCard({ value, label, color, pulse = false }: StatCardProps) {
  const displayed = useCountUp(value)
  return (
    <div
      className="bg-[var(--surface)] border border-[var(--border)] border-t-2 rounded-lg p-3 text-center relative overflow-hidden transition-shadow duration-300"
      style={{
        borderTopColor: color,
        boxShadow: pulse && value > 0 ? `0 0 20px ${color}28` : undefined,
      }}
    >
      <div
        className="font-mono text-2xl font-light tabular-nums"
        style={{ color }}
      >
        {displayed}
      </div>
      <div className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  )
}

interface StatsRowProps {
  total: number
  broken: number
  pending: number
  avgScore: number
}

export default function StatsRow({ total, broken, pending, avgScore }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-5 border-b border-[var(--border)]">
      <StatCard value={total}    label="Politicieni"       color="var(--accent2)" />
      <StatCard value={broken}   label="Promisiuni false"  color="var(--red)"     pulse />
      <StatCard value={pending}  label="În verificare"     color="var(--text3)" />
      <StatCard value={avgScore} label="Scor mediu"        color={scoreColor(avgScore)} />
    </div>
  )
}
