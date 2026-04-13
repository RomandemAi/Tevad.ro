/** Avatar colors by party short code (stored on politicians). */
export const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  PSD:  { bg: '#2a0d1e', text: '#f04545' },
  PNL:  { bg: '#0d2a4a', text: '#378ADD' },
  USR:  { bg: '#0d2a1a', text: '#22c97a' },
  AUR:  { bg: '#2a1e0d', text: '#f5a623' },
  UDMR: { bg: '#1a1a2a', text: '#a78bfa' },
  SOS:  { bg: '#2a0d0d', text: '#f04545' },
  POT:  { bg: '#0d1a2a', text: '#0ea5e9' },
  PMP:  { bg: '#1a0d0d', text: '#f04545' },
  IND:  { bg: '#1a1a1a', text: '#7a94b8' },
  PRO:  { bg: '#1a1a1a', text: '#7a94b8' },
}

export function partyColors(partyShort: string): { bg: string; text: string } {
  const key = (partyShort ?? 'IND').toUpperCase()
  return PARTY_COLORS[key] ?? PARTY_COLORS.IND
}
