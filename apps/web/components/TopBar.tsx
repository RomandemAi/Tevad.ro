interface TopBarProps {
  children: React.ReactNode
  right?: React.ReactNode
}

export default function TopBar({ children, right }: TopBarProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
      <span className="font-mono text-[11px] text-[var(--text3)] flex-1 min-w-0">{children}</span>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
