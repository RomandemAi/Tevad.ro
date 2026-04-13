/**
 * Official Government Programme 2025–2028 (coalition PSD–PNL–USR–UDMR + minorities) — citation metadata.
 * Verified against gov.ro (English PDF); Romanian edition may mirror the same content.
 */

/** HTTP 200 verified; Last-Modified from gov.ro Apache (curl -I), 2025-07-30. */
export const GOVERNMENT_PROGRAM_PDF_EN_URL =
  'https://gov.ro/fisiere/pagini_fisiere/2025-2028-programme-for-government-en.pdf'

/** Response Content-Length when verified (2026-04-12). */
export const GOVERNMENT_PROGRAM_PDF_EN_BYTES = 796_550

/** Coalition vote / publication date widely reported for the Romanian text (e.g. press, Lege5). */
export const GOVERNMENT_PROGRAM_ADOPTED_DATE = '2025-06-23'

export const GOVERNMENT_PROGRAM_MANDATE = '2025-2028' as const

export const GOVERNMENT_PROGRAM_TITLE_RO =
  'Program de guvernare PSD-PNL-USR-UDMR — Grupul parlamentar al minorităților naționale din Camera Deputaților 2025-2028'

/** Canonical record topics (align with packages/verifier/src/models.ts LLM hint). */
export const RECORD_TOPICS = [
  'infrastructure',
  'taxes',
  'healthcare',
  'education',
  'corruption',
  'economy',
  'foreign_policy',
  'social',
  'other',
  'pensions',
  'transparency',
  'coalition',
] as const

export type RecordTopic = (typeof RECORD_TOPICS)[number]

/**
 * Map Romanian programme chapter / heading fragments to Tevad `records.topic` values.
 */
export function mapProgramChapterToTopic(sectionRo: string): RecordTopic {
  const s = sectionRo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (/finant|buget|deficit|anaf|vama|fiscal|evaziune|credit|datorie|cheltuiel/.test(s)) {
    if (/taxa|impozit|tva|anaf|fiscal/.test(s)) return 'taxes'
    return 'economy'
  }
  if (/sanat|spital|medic|cnas|vaccin/.test(s)) return 'healthcare'
  if (/educat|scoala|universit|copil|elevi/.test(s)) return 'education'
  if (/infrastruct|transport|autostr|cale ferat|drum/.test(s)) return 'infrastructure'
  if (/justit|corupt|dna|penal|integritat/.test(s)) return 'corruption'
  if (/extern|nato|ue|schengen|diplomat|aparare|defens/.test(s)) return 'foreign_policy'
  if (/pensii|pension|special/.test(s)) return 'pensions'
  if (/transparent|digitaliz|administrat|guvernare|servicii publice/.test(s)) return 'transparency'
  if (/social|famil|copil|vulnerabil|locuint/.test(s)) return 'social'
  if (/coalit|parlament|vot|majoritat/.test(s)) return 'coalition'
  return 'other'
}

/** Curated high-level commitments for one-off DB seed (verbatim spirit, shortened text). */
export const PROGRAM_SEED_PROMISES: ReadonlyArray<{
  slug: string
  topic: RecordTopic
  text: string
  impact_level: 'high' | 'medium' | 'low'
}> = [
  {
    slug: 'gov-program-2025-06-deficit-reduction',
    topic: 'economy',
    impact_level: 'high',
    text:
      'Program de guvernare: reducerea deficitului bugetar prin măsuri clare de reducere a cheltuielilor publice și corecție bugetară onestă (pilon: ordine în finanțele publice).',
  },
  {
    slug: 'gov-program-2025-06-anaf-reform',
    topic: 'taxes',
    impact_level: 'high',
    text:
      'Program de guvernare: ANAF, Antifrauda și Vama reorganizate, scoase din influență politică, cu indicatori clari și digitalizare.',
  },
  {
    slug: 'gov-program-2025-06-good-governance',
    topic: 'transparency',
    impact_level: 'medium',
    text:
      'Program de guvernare: bună guvernare — administrație eficientă, responsabilă, adaptată nevoilor actuale (reformă a statului).',
  },
  {
    slug: 'gov-program-2025-06-citizen-respect',
    topic: 'social',
    impact_level: 'medium',
    text:
      'Program de guvernare: respect pentru cetățeni — echitate, servicii publice de calitate, politici sociale oneste care susțin munca.',
  },
]

export function recordContextProvenance(): string {
  return [
    `Sursă primară (PDF oficial, engleză): ${GOVERNMENT_PROGRAM_PDF_EN_URL}`,
    `Versiune fișier gov.ro (Last-Modified indicativ): 2025-07-30; dimensiune verificată: ${GOVERNMENT_PROGRAM_PDF_EN_BYTES} octeți.`,
    `Textul român al programului coaliției este asociat datei de adoptare raportate ${GOVERNMENT_PROGRAM_ADOPTED_DATE}; pentru citare în română, folosiți documentul arhivat/agreat de Guvern sau Camera Deputaților.`,
  ].join('\n')
}
