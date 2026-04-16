interface TopBarProps {
  children: React.ReactNode
  right?: React.ReactNode
}

export default function TopBar({ children, right }: TopBarProps) {
  return (
    <div className="tev-topbar-sticky sticky top-0 z-20 flex flex-shrink-0 items-center gap-3 border-b border-[var(--gray-200)] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6 [&_a]:cursor-pointer [&_a]:rounded [&_a]:transition-colors [&_a]:duration-200 [&_a]:ease-out [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-[var(--cyan)] [&_a]:focus-visible:ring-offset-2 [&_a]:focus-visible:ring-offset-[var(--surface)]">
      <span className="min-w-0 flex-1 font-mono text-[11px] text-[var(--gray-500)]">{children}</span>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}
