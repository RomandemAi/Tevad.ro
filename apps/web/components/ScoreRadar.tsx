'use client'

import { useEffect, useState } from 'react'
import { scoreColor } from '@/lib/score-utils'
import ScoreBar from './ScoreBar'

interface ScoreRadarProps {
  promises: number
  reactions: number
  sources: number
  consistency: number
}

const AXES = [
  { label: 'Promisiuni', weight: '35%', key: 'promises'    as const },
  { label: 'Surse',      weight: '25%', key: 'sources'     as const },
  { label: 'Consistență',weight: '20%', key: 'consistency' as const },
  { label: 'Reacții',    weight: '20%', key: 'reactions'   as const },
]

const CX = 90, CY = 90, R = 72

function polarToXY(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function makePolygon(values: number[], scale = 1) {
  const n = values.length
  return values
    .map((v, i) => {
      const { x, y } = polarToXY((360 / n) * i, (v / 100) * R * scale)
      return `${x},${y}`
    })
    .join(' ')
}

export default function ScoreRadar({ promises, reactions, sources, consistency }: ScoreRadarProps) {
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setScale(1), 80)
    return () => clearTimeout(t)
  }, [])

  const vals = [promises, sources, consistency, reactions]
  const n = vals.length
  const grids = [25, 50, 75, 100]

  return (
    <div className="flex gap-4 items-start">
      {/* SVG Radar */}
      <div className="flex-shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Grid polygons */}
          {grids.map(g => (
            <polygon
              key={g}
              points={makePolygon(Array(n).fill(g))}
              fill="none"
              stroke="var(--border)"
              strokeWidth="0.8"
            />
          ))}

          {/* Axis lines */}
          {Array.from({ length: n }).map((_, i) => {
            const { x, y } = polarToXY((360 / n) * i, R)
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--border)" strokeWidth="0.8" />
          })}

          {/* Data polygon */}
          <polygon
            points={makePolygon(vals, scale)}
            fill="rgba(29,110,245,0.15)"
            stroke="#1d6ef5"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{ transition: 'points 0.7s cubic-bezier(0.34,1.56,0.64,1)' }}
          />

          {/* Axis endpoint dots */}
          {vals.map((v, i) => {
            const { x, y } = polarToXY((360 / n) * i, (v / 100) * R * scale)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={scoreColor(v)}
                style={{ transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1)' }}
              />
            )
          })}

          {/* Axis labels */}
          {AXES.map((ax, i) => {
            const { x, y } = polarToXY((360 / n) * i, R + 14)
            const anchor = x < CX - 4 ? 'end' : x > CX + 4 ? 'start' : 'middle'
            return (
              <g key={i}>
                <text
                  x={x}
                  y={y - 4}
                  textAnchor={anchor}
                  fill="var(--text2)"
                  fontSize="8"
                  fontFamily="var(--font-mono), monospace"
                >
                  {ax.label}
                </text>
                <text
                  x={x}
                  y={y + 6}
                  textAnchor={anchor}
                  fill="var(--text3)"
                  fontSize="7"
                  fontFamily="var(--font-mono), monospace"
                >
                  {ax.weight}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Score breakdown bars */}
      <div className="flex-1 space-y-2.5 pt-2">
        {AXES.map(ax => {
          const v = { promises, reactions, sources, consistency }[ax.key]
          return (
            <div key={ax.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider">
                  {ax.label}
                  <span className="text-[var(--text3)] opacity-50 ml-1">{ax.weight}</span>
                </span>
                <span
                  className="font-mono text-[11px] font-medium tabular-nums"
                  style={{ color: scoreColor(v) }}
                >
                  {v}
                </span>
              </div>
              <ScoreBar value={v} glow />
            </div>
          )
        })}
      </div>
    </div>
  )
}
