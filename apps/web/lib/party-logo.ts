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
