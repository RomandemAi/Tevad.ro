'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  APPEARANCE_STORAGE_KEY,
  type AppearanceMode,
  applyAppearanceClass,
  persistAppearance,
  readStoredAppearance,
} from '@/lib/appearance'

const OPTIONS: { id: AppearanceMode; label: string; title: string }[] = [
  { id: 'light', label: 'Luminos', title: 'Aspect luminos' },
  { id: 'dark', label: 'Întunecat', title: 'Aspect întunecat (noapte)' },
  { id: 'system', label: 'Sistem', title: 'Urmează setarea dispozitivului' },
]

interface AppearanceControlProps {
  /** Sidebar: light-on-dark chips. Footer: compact row on navy. */
  variant?: 'sidebar' | 'footer'
}

export default function AppearanceControl({ variant = 'sidebar' }: AppearanceControlProps) {
  const [mode, setMode] = useState<AppearanceMode>('system')

  useEffect(() => {
    setMode(readStoredAppearance())
    applyAppearanceClass(readStoredAppearance())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== APPEARANCE_STORAGE_KEY || !e.newValue) return
      if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
        setMode(e.newValue)
        applyAppearanceClass(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setAppearance = useCallback((next: AppearanceMode) => {
    setMode(next)
    persistAppearance(next)
  }, [])

  const isFooter = variant === 'footer'

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.35)]">
        Aspect
      </p>
      <div
        className={`flex gap-1 ${isFooter ? 'flex-wrap' : 'flex-col sm:flex-col'}`}
        role="group"
        aria-label="Aspect (luminos, întunecat sau sistem)"
      >
        {OPTIONS.map((opt) => {
          const active = mode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.title}
              onClick={() => setAppearance(opt.id)}
              className={
                isFooter
                  ? `rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)] ${
                      active
                        ? 'border-[rgba(14,165,233,0.55)] bg-[rgba(255,255,255,0.12)] text-white'
                        : 'border-[rgba(255,255,255,0.12)] bg-transparent text-[rgba(255,255,255,0.55)] hover:border-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.85)]'
                    }`
                  : `rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy)] ${
                      active
                        ? 'border-[rgba(14,165,233,0.55)] bg-[rgba(255,255,255,0.12)] text-white'
                        : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.65)] hover:border-[rgba(255,255,255,0.14)] hover:text-white'
                    }`
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
