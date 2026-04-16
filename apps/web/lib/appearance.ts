export type AppearanceMode = 'light' | 'dark' | 'system'

export const APPEARANCE_STORAGE_KEY = 'tev-appearance' as const

const THEME_CLASSES = ['tev-theme-light', 'tev-theme-dark', 'tev-theme-system'] as const

export function readStoredAppearance(): AppearanceMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export function applyAppearanceClass(mode: AppearanceMode) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  for (const c of THEME_CLASSES) el.classList.remove(c)
  el.classList.add(`tev-theme-${mode}`)
}

export function persistAppearance(mode: AppearanceMode) {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
  applyAppearanceClass(mode)
}

export const appearanceBootScript = `!function(){try{var k=${JSON.stringify(APPEARANCE_STORAGE_KEY)};var v=localStorage.getItem(k);if(v!=="light"&&v!=="dark"&&v!=="system")v="system";var d=document.documentElement;d.classList.remove("tev-theme-light","tev-theme-dark","tev-theme-system");d.classList.add("tev-theme-"+v);}catch(e){}}();`
