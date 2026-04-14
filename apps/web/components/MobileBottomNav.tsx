'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type TabId = 'politicieni' | 'clasament' | 'false' | 'cauta'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    setHash(typeof window !== 'undefined' ? window.location.hash : '')
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [pathname])

  const activeTab = (): TabId | null => {
    if (pathname === '/broken') return 'false'
    if (pathname !== '/') return null
    if (hash === '#clasament') return 'clasament'
    if (hash === '#filter') return 'cauta'
    return 'politicieni'
  }

  const cur = activeTab()

  const tabClass = (id: TabId) =>
    `relative flex flex-1 cursor-pointer flex-col items-center justify-center px-1 font-mono text-[11px] leading-tight min-h-[44px] transition-colors duration-200 ease-out active:bg-[rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cyan)] ${
      cur === id ? 'text-white' : 'text-[rgba(255,255,255,0.55)]'
    }`

  return (
    <nav
      className="te-mobile-nav tev-mobile-nav-elevated fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-[rgba(255,255,255,0.08)] bg-[var(--navy)] pb-[env(safe-area-inset-bottom)] text-[rgba(255,255,255,0.55)] md:hidden"
      aria-label="Navigare principală"
    >
      <Link href="/" className={tabClass('politicieni')}>
        {cur === 'politicieni' && (
          <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
        )}
        Politicieni
      </Link>
      <Link href="/#clasament" className={tabClass('clasament')}>
        {cur === 'clasament' && (
          <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
        )}
        Clasament
      </Link>
      <Link href="/broken" className={tabClass('false')}>
        {cur === 'false' && (
          <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
        )}
        False
      </Link>
      <Link href="/#filter" className={tabClass('cauta')}>
        {cur === 'cauta' && (
          <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
        )}
        Caută
      </Link>
    </nav>
  )
}
