'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const INDEX = [
  { href: '/', label: 'Politicieni', exact: true as const },
  { href: '/#clasament', label: 'Clasament' },
  { href: '/promises', label: 'Toate promisiunile' },
] as const

const FILTERS = [
  {
    href: '/broken',
    label: 'Promisiuni false',
    dot: <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--red)] pulse" aria-hidden />,
  },
  { href: '/verified', label: 'Verificate adevărate' },
  {
    href: '/about#declaratii-ccr',
    label: 'Declarații oprite',
    dot: <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--amber)]" aria-hidden />,
  },
] as const

function NavIconPolitician() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function NavIconChart() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5H2v-5zM9 4a1 1 0 011-1h2a1 1 0 011 1v12H9V4zM16 8a1 1 0 011-1h2a1 1 0 011 1v8h-4V8z" />
    </svg>
  )
}

function NavIconDoc() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function NavIconWarn() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function NavIconCheck() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function NavIconInfo() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function NavIconScale() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2L3 6v2c0 5 3.5 9 7 10 3.5-1 7-5 7-10V6l-7-4z" />
    </svg>
  )
}

const INDEX_ICONS = [NavIconPolitician, NavIconChart, NavIconDoc]
const FILTER_ICONS = [NavIconWarn, NavIconCheck, NavIconWarn]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

function pathOnly(href: string) {
  const i = href.indexOf('#')
  const p = i >= 0 ? href.slice(0, i) : href
  return p || '/'
}

export default function Sidebar({ className = '', onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    setHash(typeof window !== 'undefined' ? window.location.hash : '')
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [pathname])

  const linkBase =
    'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-[13px] text-[rgba(255,255,255,0.65)] transition-colors duration-200 ease-out hover:bg-[rgba(255,255,255,0.08)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)] md:hover:bg-[rgba(255,255,255,0.08)]'
  const linkActive =
    'border-l-[3px] border-l-[var(--blue)] bg-[rgba(255,255,255,0.12)] pl-[13px] text-white'

  const routeActive = (href: string, exact?: boolean) => {
    const path = pathOnly(href)
    return exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  }

  const indexActive = (i: number) => {
    const item = INDEX[i]
    if (item.href === '/') {
      const homeSub = ['#clasament', '#filter', '#cum-functioneaza']
      return pathname === '/' && !homeSub.includes(hash)
    }
    if (item.href === '/#clasament') return pathname === '/' && hash === '#clasament'
    return routeActive(item.href, false)
  }

  const filterActive = (i: number) => {
    const href = FILTERS[i].href
    const path = pathOnly(href)
    const h = href.includes('#') ? href.slice(href.indexOf('#')) : ''
    if (h && pathname === path) return hash === h
    return routeActive(href, false)
  }

  const infoActive = (id: string) => pathname === '/about' && hash === `#${id}`

  return (
    <aside
      className={`te-sidebar tev-shell-sidebar fixed inset-y-0 left-0 z-40 flex w-[240px] flex-shrink-0 flex-col text-white ${className}`}
    >
      <div className="border-b border-[rgba(255,255,255,0.06)] p-5">
        <div className="relative mb-4 pr-12">
          <Link
            href="/"
            onClick={() => onNavigate?.()}
            className="block cursor-pointer rounded-md outline-none ring-offset-2 ring-offset-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
          >
            <span className="block rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.26)] backdrop-blur-sm">
              <span className="block font-mono text-[18px] font-semibold leading-none tracking-[-0.02em] text-white">
                Te <span className="text-white/90">Văd</span>
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.58)]">
                tevad.org
              </span>
              <span className="mt-2 block h-[2px] w-[86px] rounded-full bg-gradient-to-r from-[rgba(29,110,245,0.9)] via-[rgba(252,209,22,0.75)] to-[rgba(206,17,38,0.75)] opacity-85" />
              <span className="mt-2 block font-sans text-[10px] leading-snug text-[rgba(255,255,255,0.42)]">
                Promisiunile nu expiră.
              </span>
            </span>
          </Link>
          <span
            className="pointer-events-none absolute right-0 top-0 inline-flex items-center rounded-[3px] border px-1.5 py-[2px] font-mono text-[8px] tracking-[0.5px]"
            style={{
              background: 'rgba(245,166,35,0.15)',
              color: '#f5a623',
              borderColor: 'rgba(245,166,35,0.3)',
            }}
          >
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--green)] pulse" aria-hidden />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.55)]">
            Sistem activ
          </span>
        </div>
        <p className="mt-3 font-sans text-[10px] leading-relaxed text-[rgba(255,255,255,0.42)]">
          Urmărirea responsabilității pornește de la lansare. Completăm registrul în fiecare zi, cu informații
          verificabile și surse publice.
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <p className="px-4 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)]">
          Index
        </p>
        {INDEX.map((item, i) => {
          const Icon = INDEX_ICONS[i] ?? NavIconPolitician
          const active = indexActive(i)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={`${linkBase} ${active ? linkActive : 'border-l-[3px] border-l-transparent'}`}
            >
              <Icon />
              {item.label}
            </Link>
          )
        })}

        <p className="px-4 pb-1 pt-5 font-mono text-[9px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)]">
          Filtre
        </p>
        {FILTERS.map((item, i) => {
          const Icon = FILTER_ICONS[i] ?? NavIconWarn
          const active = filterActive(i)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={`${linkBase} ${active ? linkActive : 'border-l-[3px] border-l-transparent'}`}
            >
              <Icon />
              {item.label}
              {'dot' in item && item.dot}
            </Link>
          )
        })}

        <p className="px-4 pb-1 pt-5 font-mono text-[9px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.35)]">
          Info
        </p>
        <Link
          href="/cum-functioneaza"
          onClick={() => onNavigate?.()}
          className={`${linkBase} ${routeActive('/cum-functioneaza', true) ? linkActive : 'border-l-[3px] border-l-transparent'}`}
        >
          <NavIconInfo />
          Cum funcționează
        </Link>
        <Link
          href="/neutralitate"
          onClick={() => onNavigate?.()}
          className={`${linkBase} ${routeActive('/neutralitate', true) ? linkActive : 'border-l-[3px] border-l-transparent'}`}
        >
          <NavIconScale />
          Neutralitate
        </Link>
        <Link
          href="/despre"
          onClick={() => onNavigate?.()}
          className={`${linkBase} ${routeActive('/despre', true) ? linkActive : 'border-l-[3px] border-l-transparent'}`}
        >
          <NavIconInfo />
          Despre
        </Link>
        <Link
          href="/legal"
          onClick={() => onNavigate?.()}
          className={`${linkBase} ${routeActive('/legal', true) ? linkActive : 'border-l-[3px] border-l-transparent'}`}
        >
          <NavIconInfo />
          Legal
        </Link>
        <Link
          href="/privacy"
          onClick={() => onNavigate?.()}
          className={`${linkBase} ${routeActive('/privacy', true) ? linkActive : 'border-l-[3px] border-l-transparent'}`}
        >
          <NavIconInfo />
          Privacy
        </Link>
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
        <p className="font-mono text-[9px] tracking-wide text-[rgba(255,255,255,0.2)]">
          OPEN SOURCE · MIT · v2.0
        </p>
      </div>
    </aside>
  )
}
