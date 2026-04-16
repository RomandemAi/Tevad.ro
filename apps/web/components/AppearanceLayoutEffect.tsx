'use client'

import { useLayoutEffect } from 'react'
import { applyAppearanceClass, readStoredAppearance } from '@/lib/appearance'

/** Re-apply theme after React hydrates `<html className>` (which would otherwise drop script-set theme classes). */
export default function AppearanceLayoutEffect() {
  useLayoutEffect(() => {
    applyAppearanceClass(readStoredAppearance())
  }, [])
  return null
}
