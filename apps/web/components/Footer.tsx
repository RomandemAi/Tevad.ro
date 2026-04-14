/* eslint-disable @next/next/no-html-link-for-pages */
'use client'

import Link from 'next/link'

const GH_REPO = 'https://github.com/RomandemAi/Tevad.ro' as const

export default function Footer() {
  return (
    <footer className="tev-chrome-navy mt-auto border-t border-[rgba(255,255,255,0.08)] px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-wide text-[rgba(255,255,255,0.72)]">
          <Link
            href="/legal"
            className="cursor-pointer transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)]"
          >
            Legal
          </Link>
          <span className="text-[rgba(255,255,255,0.25)]">·</span>
          <Link
            href="/privacy"
            className="cursor-pointer transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)]"
          >
            Privacy
          </Link>
          <span className="text-[rgba(255,255,255,0.25)]">·</span>
          <Link
            href="/despre"
            className="cursor-pointer transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)]"
          >
            Despre
          </Link>
          <span className="text-[rgba(255,255,255,0.25)]">·</span>
          <a
            href={GH_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)]"
          >
            GitHub
          </a>
          <span className="text-[rgba(255,255,255,0.25)]">·</span>
          <a
            href="mailto:contact@tevad.org"
            className="cursor-pointer transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)]"
          >
            contact@tevad.org
          </a>
        </div>

        <div className="font-mono text-[9px] tracking-wide text-[var(--text3)]">
          © 2026 Tevad.org · Proiect civic open-source · MIT
        </div>

        <div className="flex items-center justify-center gap-2 text-center font-mono text-[9px] tracking-wide text-[var(--text3)]">
          <svg
            className="h-4 w-4 shrink-0 text-[var(--cyan)] opacity-85"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <circle cx="7" cy="7" r="2.75" fill="currentColor" />
            <circle cx="13" cy="13" r="2.75" fill="currentColor" opacity="0.45" />
            <path
              d="M9.2 9.2 12.2 12.2"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
          <span>Powered by Cosmo &amp; Claude</span>
        </div>
      </div>
    </footer>
  )
}

