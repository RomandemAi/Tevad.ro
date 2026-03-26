import { scoreColor } from '@/lib/score-utils'

interface ScoreBarProps {
  value: number
  width?: string
  height?: string
  glow?: boolean
  className?: string
}

export default function ScoreBar({
  value,
  width = 'w-full',
  height = 'h-[3px]',
  glow = false,
  className = '',
}: ScoreBarProps) {
  const color = scoreColor(value)
  return (
    <div className={`${width} ${height} bg-[var(--border)] rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.max(value, 0)}%`,
          background: color,
          boxShadow: glow ? `0 0 6px ${color}88` : undefined,
        }}
      />
    </div>
  )
}
