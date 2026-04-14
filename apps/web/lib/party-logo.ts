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
