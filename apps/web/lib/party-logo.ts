import type { CSSProperties } from 'react'

/** Abbreviations with a static file in `public/party-logos/{CODE}.png` */
export const PARTY_LOGO_CODES = new Set([
  'PSD',
  'AUR',
  'PNL',
  'USR',
  'UDMR',
  'SOS',
  'POT',
  'IND',
  'MIN',
  'FD',
  'PRO',
  'PMP',
  'PACE',
])

/** Normalize e.g. "usr" / " USR " → USR */
export function normalizePartyCode(partyShort: string | null | undefined): string | null {
  if (!partyShort?.trim()) return null
  return partyShort.trim().toUpperCase()
}

export function partyLogoSrc(partyShort: string | null | undefined): string | null {
  const code = normalizePartyCode(partyShort)
  if (!code || !PARTY_LOGO_CODES.has(code)) return null
  return `/party-logos/${code}.png`
}

/** Soft background for logo-only badge (no text label). */
export function partyBadgeBackground(partyShort: string | null | undefined): string {
  const code = normalizePartyCode(partyShort) ?? ''
  const map: Record<string, string> = {
    PSD: 'rgba(220,38,38,0.12)',
    PNL: 'rgba(29,110,245,0.12)',
    USR: 'rgba(22,163,74,0.12)',
    AUR: 'rgba(217,119,6,0.14)',
    UDMR: 'rgba(126,34,206,0.12)',
    SOS: 'rgba(107,45,139,0.12)',
    POT: 'rgba(0,168,181,0.12)',
    IND: 'rgba(105,105,105,0.15)',
    MIN: 'rgba(128,128,128,0.15)',
    FD: 'rgba(65,105,225,0.12)',
    PRO: 'rgba(220,20,60,0.12)',
    PMP: 'rgba(255,69,0,0.12)',
    PACE: 'rgba(34,139,34,0.12)',
  }
  return map[code] ?? 'var(--gray-100)'
}

/** Soft radial “washes” (party hue → neutral grey) for politician profile hero. */
type PartyHeaderAccent = { a: string; b: string; c?: string }

const PARTY_HEADER_ACCENT: Record<string, PartyHeaderAccent> = {
  PSD: {
    a: 'rgba(220, 38, 38, 0.2)',
    b: 'rgba(248, 113, 113, 0.09)',
    c: 'rgba(185, 28, 28, 0.06)',
  },
  PNL: {
    a: 'rgba(29, 110, 245, 0.22)',
    b: 'rgba(96, 165, 250, 0.1)',
    c: 'rgba(29, 78, 216, 0.07)',
  },
  USR: {
    a: 'rgba(22, 163, 74, 0.2)',
    b: 'rgba(74, 222, 128, 0.09)',
    c: 'rgba(21, 128, 61, 0.06)',
  },
  AUR: {
    a: 'rgba(217, 119, 6, 0.2)',
    b: 'rgba(251, 191, 36, 0.1)',
    c: 'rgba(180, 83, 9, 0.07)',
  },
  UDMR: {
    a: 'rgba(126, 34, 206, 0.18)',
    b: 'rgba(192, 132, 252, 0.09)',
    c: 'rgba(88, 28, 135, 0.06)',
  },
  SOS: {
    a: 'rgba(107, 45, 139, 0.2)',
    b: 'rgba(167, 139, 250, 0.09)',
    c: 'rgba(76, 29, 149, 0.07)',
  },
  POT: {
    a: 'rgba(0, 168, 181, 0.2)',
    b: 'rgba(103, 232, 249, 0.1)',
    c: 'rgba(8, 145, 178, 0.06)',
  },
  FD: {
    a: 'rgba(65, 105, 225, 0.18)',
    b: 'rgba(129, 161, 248, 0.09)',
    c: 'rgba(37, 56, 150, 0.06)',
  },
  PRO: {
    a: 'rgba(220, 20, 60, 0.18)',
    b: 'rgba(251, 113, 133, 0.09)',
    c: 'rgba(159, 18, 57, 0.06)',
  },
  PMP: {
    a: 'rgba(255, 69, 0, 0.18)',
    b: 'rgba(253, 186, 116, 0.1)',
    c: 'rgba(194, 65, 12, 0.06)',
  },
  PACE: {
    a: 'rgba(34, 139, 34, 0.18)',
    b: 'rgba(134, 239, 172, 0.09)',
    c: 'rgba(22, 101, 52, 0.06)',
  },
  IND: {
    a: 'rgba(100, 116, 139, 0.16)',
    b: 'rgba(148, 163, 184, 0.08)',
    c: 'rgba(71, 85, 105, 0.05)',
  },
  MIN: {
    a: 'rgba(100, 116, 139, 0.14)',
    b: 'rgba(148, 163, 184, 0.07)',
    c: 'rgba(71, 85, 105, 0.05)',
  },
}

/** Stacked backgrounds: party-colored radials over neutral vertical wash (theme-aware via CSS vars). */
export function partyProfileHeaderStyle(partyShort: string | null | undefined): CSSProperties {
  const code = normalizePartyCode(partyShort) ?? ''
  const accent = PARTY_HEADER_ACCENT[code]
  const base = 'linear-gradient(to bottom, var(--white), var(--gray-50))'
  if (!accent) {
    return { backgroundImage: base }
  }
  const bottom = accent.c ?? 'transparent'
  const layers = [
    `radial-gradient(ellipse 125% 95% at 4% -5%, ${accent.a}, transparent 58%)`,
    `radial-gradient(ellipse 110% 85% at 96% 4%, ${accent.b}, transparent 55%)`,
    `radial-gradient(ellipse 90% 55% at 50% 108%, ${bottom}, transparent 52%)`,
    base,
  ]
  return {
    backgroundImage: layers.join(', '),
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat',
    backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
    backgroundPosition: 'center, center, center, center',
  }
}
