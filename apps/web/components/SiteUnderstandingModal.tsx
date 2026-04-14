'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

const STORAGE_KEY = 'tevad_ux_ack_v1'

/** ISO date YYYY-MM-DD; override via NEXT_PUBLIC_BETA_LAUNCH_DATE (inlined at build). */
const BETA_LAUNCH_ISO = process.env.NEXT_PUBLIC_BETA_LAUNCH_DATE?.trim() || '2026-04-14'

function parseIsoDateOnly(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, m: mo, d }
}

/** Whole calendar days from launch (local midnight) to today (local midnight). */
function wholeDaysSinceLaunch(iso: string): number | null {
  const p = parseIsoDateOnly(iso)
  if (!p) return null
  const now = new Date()
  const end = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const start = Date.UTC(p.y, p.m - 1, p.d)
  return Math.floor((end - start) / 86400000)
}

function launchLine(iso: string): string {
  const days = wholeDaysSinceLaunch(iso)
  if (days === null) return `Lansare beta: ${iso}.`
  if (days < 0) return `Lansare beta: ${iso}.`
  if (days === 0) return `Lansare beta: ${iso} (azi).`
  if (days === 1) return `Lansare beta: ${iso} (acum 1 zi).`
  return `Lansare beta: ${iso} (acum ${days} zile).`
}

export default function SiteUnderstandingModal() {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const acknowledgeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
    try {
      if (typeof window === 'undefined') return
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return
      setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  const acknowledge = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [])

  const dismissForNow = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => acknowledgeRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissForNow()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, dismissForNow])

  if (!mounted || !open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" aria-hidden={false}>
      <button
        type="button"
        className="absolute inset-0 bg-[var(--gray-900)]/50 backdrop-blur-[2px]"
        aria-label="Închide fereastra (poți deschide din nou la următoarea vizită)"
        onClick={dismissForNow}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[85] w-full max-w-lg rounded-2xl border border-[var(--gray-200)] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-[3px] border px-1.5 py-[3px] font-mono text-[8px] font-medium tracking-[0.5px]"
            style={{
              background: 'rgba(245,166,35,0.15)',
              color: '#f5a623',
              borderColor: 'rgba(245,166,35,0.3)',
            }}
          >
            BETA
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
            Înainte să continui
          </span>
        </div>

        <h2 id={titleId} className="mt-3 font-sans text-lg font-semibold leading-snug text-[var(--gray-900)]">
          Ce este Tevad.org și cum funcționează
        </h2>

        <p className="mt-3 font-sans text-[14px] leading-relaxed text-[var(--gray-700)]">
          <strong className="font-semibold text-[var(--gray-900)]">{launchLine(BETA_LAUNCH_ISO)}</strong> Nu suntem
          susținuți sau finanțați de partide, companii sau instituții — proiect independent, open source. Urmărirea
          registrului pornește de la această dată; îl completăm în fiecare zi cu informații verificabile și surse
          publice.
        </p>

        <p className="mt-3 font-sans text-[14px] leading-relaxed text-[var(--gray-700)]">
          Este un registru public: promisiuni, declarații și voturi — cu surse citate. Nu este un site oficial al
          statului.
        </p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5 font-sans text-[14px] leading-relaxed text-[var(--gray-700)]">
          <li>
            Informațiile publice sunt adunate și procesate <strong className="font-semibold">automat</strong>, cu{' '}
            <strong className="font-semibold">același flux</strong> pentru toți politicienii.
          </li>
          <li>
            Verdicturile de verificare sunt generate <strong className="font-semibold">automat</strong>, în mod{' '}
            <strong className="font-semibold">„blind”</strong> (în prompt nu intră numele politicianului — doar text,
            dată și extrase din surse), cu pagină de audit.
          </li>
          <li>
            Scorul 0–100 vine din <strong className="font-semibold">reguli și ponderi publice</strong>, nu din „opinia
            redacției”.
          </li>
        </ul>

        <p className="mt-4 font-mono text-[12px]">
          <Link href="/cum-functioneaza" className="text-[var(--blue)] hover:underline">
            Detalii complete: Cum funcționează →
          </Link>
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={dismissForNow}
            className="rounded-lg border border-[var(--gray-200)] bg-white px-4 py-2.5 font-mono text-[12px] font-medium text-[var(--gray-700)] transition-colors hover:bg-[var(--gray-50)]"
          >
            Nu acum
          </button>
          <button
            ref={acknowledgeRef}
            type="button"
            onClick={acknowledge}
            className="rounded-lg bg-[var(--navy)] px-4 py-2.5 font-mono text-[12px] font-medium text-white transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)] focus:ring-offset-2"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>
  )
}
