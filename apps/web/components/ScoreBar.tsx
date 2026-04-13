import type { CSSProperties } from 'react'
import { scoreColor } from '@/lib/score-utils'

interface ScoreBarProps {
  value: number
  /** Tailwind width class when widthPx omitted */
  width?: string
  height?: string
  /** Fixed width in px — use in lists so layout works without Tailwind */
  widthPx?: number
  heightPx?: number
  /** @deprecated No shadow/glow per design system */
  glow?: boolean
  className?: string
}

export default function ScoreBar({
  value,
  width = 'w-full',
  height = 'h-[3px]',
  widthPx,
  heightPx = 3,
  className = '',
}: ScoreBarProps) {
  const color = scoreColor(value)
  const outer: CSSProperties = {
    height: heightPx,
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: 'var(--gray-200)',
    ...(widthPx != null
      ? { width: widthPx, minWidth: widthPx, maxWidth: widthPx }
      : { width: '100%' }),
  }

  return (
    <div className={`${widthPx == null ? `${width} ${height}` : ''} ${className}`.trim()} style={outer}>
      <div
        style={{
          height: '100%',
          width: `${Math.max(value, 0)}%`,
          maxWidth: '100%',
          background: color,
          borderRadius: 9999,
        }}
      />
    </div>
  )
}
