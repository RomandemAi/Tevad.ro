'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type TabId = 'politicieni' | 'promises' | 'declaratii' | 'clasament' | 'false' | 'cauta'

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
    if (pathname === '/promises') return 'promises'
    if (pathname === '/declaratii') return 'declaratii'
    if (pathname !== '/') return null
    if (hash === '#clasament') return 'clasament'
    if (hash === '#filter') return 'cauta'
    return 'politicieni'
  }

  const cur = activeTab()

  const tabClass = (id: TabId) =>
    `relative flex min-w-[4.75rem] flex-shrink-0 cursor-pointer flex-col items-center justify-center px-2 font-mono text-[10px] leading-tight min-h-[44px] transition-colors duration-200 ease-out active:bg-[rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cyan)] ${
      cur === id ? 'text-white' : 'text-[rgba(255,255,255,0.55)]'
    }`

  return (
    <nav
      className="te-mobile-nav tev-chrome-navy tev-mobile-nav-elevated fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-[rgba(255,255,255,0.08)] pb-[env(safe-area-inset-bottom)] text-[rgba(255,255,255,0.55)] md:hidden"
      aria-label="Navigare principală"
    >
      <div className="flex w-full min-w-0 flex-nowrap items-stretch overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href="/" className={tabClass('politicieni')}>
          {cur === 'politicieni' && (
            <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
          )}
          Politicieni
        </Link>
        <Link href="/promises" className={tabClass('promises')}>
          {cur === 'promises' && (
            <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
          )}
          Promisiuni
        </Link>
        <Link href="/declaratii" className={tabClass('declaratii')}>
          {cur === 'declaratii' && (
            <span className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-[var(--cyan)]" aria-hidden />
          )}
          Declarații
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
      </div>
    </nav>
  )
}
