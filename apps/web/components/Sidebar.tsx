'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Politicieni',
    icon: (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
      </svg>
    ),
    exact: true,
  },
  {
    href: '/promises',
    label: 'Toate promisiunile',
    icon: (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
      </svg>
    ),
  },
]

const FILTER_ITEMS = [
  {
    href: '/broken',
    label: 'Promisiuni false',
    icon: (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
    ),
    badge: <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] ml-auto pulse" />,
    activeColor: 'red',
  },
  {
    href: '/verified',
    label: 'Verificate adevărate',
    icon: (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
      </svg>
    ),
    activeColor: 'green',
  },
]

const ACTIVE_STYLES: Record<string, string> = {
  blue:  'text-[var(--accent2)] bg-[rgba(29,110,245,0.12)] border border-[rgba(29,110,245,0.25)]',
  red:   'text-[var(--red)] bg-[rgba(240,69,69,0.08)] border border-[rgba(240,69,69,0.25)]',
  green: 'text-[var(--green)] bg-[rgba(34,201,122,0.08)] border border-[rgba(34,201,122,0.25)]',
}

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-[210px] flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" stroke="#1d6ef5" strokeWidth="1.2"/>
            <path d="M14 7L21 11V19L14 23L7 19V11L14 7Z" fill="rgba(29,110,245,0.12)" stroke="#1d6ef5" strokeWidth="0.6"/>
            <circle cx="14" cy="15" r="2.5" fill="#0ea5e9"/>
          </svg>
          <span className="font-mono text-[15px] font-medium tracking-widest">
            VERI<span className="text-[var(--accent2)]">DEX</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse" />
          <span className="font-mono text-[10px] text-[var(--text3)] tracking-wide">SISTEM ACTIV · RO-v2.0</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 flex-1">
        <p className="font-mono text-[9px] text-[var(--text3)] tracking-[1.5px] uppercase px-2 py-2">Index</p>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] mb-0.5 transition-colors ${
                active
                  ? ACTIVE_STYLES.blue
                  : 'text-[var(--text2)] hover:bg-[var(--surface2)] border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        <p className="font-mono text-[9px] text-[var(--text3)] tracking-[1.5px] uppercase px-2 py-2 mt-2">Filtre</p>
        {FILTER_ITEMS.map(item => {
          const active = isActive(item.href)
          const colorKey = item.activeColor ?? 'blue'
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] mb-0.5 transition-colors ${
                active
                  ? ACTIVE_STYLES[colorKey]
                  : 'text-[var(--text2)] hover:bg-[var(--surface2)] border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)]">
        <p className="font-mono text-[9px] text-[var(--text3)] tracking-wide">TEVAD.RO · RO · OPEN SOURCE</p>
      </div>
    </aside>
  )
}
