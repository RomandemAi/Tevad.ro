/**
 * Official Government Programme 2025–2028 (coalition PSD–PNL–USR–UDMR + minorities) — citation metadata.
 * Verified against gov.ro (English PDF); Romanian edition may mirror the same content.
 */

/** HTTP 200 verified; Last-Modified from gov.ro Apache (curl -I), 2025-07-30. */
export const GOVERNMENT_PROGRAM_PDF_EN_URL =
  'https://gov.ro/fisiere/pagini_fisiere/2025-2028-programme-for-government-en.pdf'

/**
 * Romanian programme PDF (public mirror / archive).
 * Note: If an official gov.ro RO PDF becomes available, prefer that URL instead.
 */
export const GOVERNMENT_PROGRAM_PDF_RO_URL =
  'https://media.dcnews.ro/other/202506/program-de-guvernare-23-iunie-2025_17136100.pdf'

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
  /**
   * Optional reference hint for humans (page / section in the programme PDF).
   * Stored in records.context by the seeding script.
   */
  ref?: string
}> = [
  {
    slug: 'gov-program-2025-06-deficit-reduction',
    topic: 'economy',
    impact_level: 'high',
    text:
      'Program de guvernare: reducerea deficitului bugetar prin măsuri clare de reducere a cheltuielilor publice și corecție bugetară onestă (pilon: ordine în finanțele publice).',
    ref: 'Program de guvernare 2025–2028 — Ordine în finanțele publice (p. 2)',
  },
  {
    slug: 'gov-program-2025-06-anaf-reform',
    topic: 'taxes',
    impact_level: 'high',
    text:
      'Program de guvernare: ANAF, Antifrauda și Vama reorganizate, scoase din influență politică, cu indicatori clari și digitalizare.',
    ref: 'Program de guvernare 2025–2028 — Ordine în finanțele publice (p. 2)',
  },
  {
    slug: 'gov-program-2025-06-good-governance',
    topic: 'transparency',
    impact_level: 'medium',
    text:
      'Program de guvernare: bună guvernare — administrație eficientă, responsabilă, adaptată nevoilor actuale (reformă a statului).',
    ref: 'Program de guvernare 2025–2028 — Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-citizen-respect',
    topic: 'social',
    impact_level: 'medium',
    text:
      'Program de guvernare: respect pentru cetățeni — echitate, servicii publice de calitate, politici sociale oneste care susțin munca.',
    ref: 'Program de guvernare 2025–2028 — Respect pentru cetățeni (p. 4)',
  },
  // ------------------------------------------------------------
  // High-impact, measurable commitments extracted from the RO programme PDF.
  // Keep promises atomic and future-oriented.
  // ------------------------------------------------------------
  {
    slug: 'gov-program-2025-06-criminalize-tax-evasion',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: criminalizarea evaziunii fiscale (inclusiv în formă organizată) și înăsprirea legislației de combatere.',
    ref: 'Ordine în finanțele publice / Combaterea evaziunii (p. 2, p. 5)',
  },
  {
    slug: 'gov-program-2025-06-insolvency-law-tighten',
    topic: 'economy',
    impact_level: 'high',
    text: 'Program de guvernare: modificarea legii insolvenței pentru înăsprirea regimului și evitarea insolvențelor în cascadă.',
    ref: 'Combaterea evaziunii / Legea insolvenței (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-risk-based-tax-audits-big-data',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: controale fiscale bazate pe analiză de risc realizată pe volume mari de date și digitalizare completă în ANAF/Antifraudă/Vamă.',
    ref: 'Ordine în finanțele publice (p. 2)',
  },
  {
    slug: 'gov-program-2025-06-evasion-priority-constanta-customs',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: combaterea evaziunii cu prioritate în domeniul petrolier, importuri agroalimentare și importuri prin Vămi/Portul Constanța (relația cu Asia).',
    ref: 'Combaterea evaziunii (p. 2, p. 5)',
  },
  {
    slug: 'gov-program-2025-06-evaluate-and-remove-tax-exemptions',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: evaluarea tuturor excepțiilor și facilităților fiscale și eliminarea celor fără efecte economice clare.',
    ref: 'Ordine în finanțele publice (p. 2)',
  },
  {
    slug: 'gov-program-2025-06-apply-cass-large-pensions',
    topic: 'pensions',
    impact_level: 'high',
    text: 'Program de guvernare: aplicarea CASS inclusiv la pensiile mari.',
    ref: 'Ordine în finanțele publice / Consolidare fiscală (p. 2, p. 5)',
  },
  {
    slug: 'gov-program-2025-06-increase-dividend-tax',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: creșterea impozitului pe dividende (măsură de consolidare fiscală, jalon PNRR).',
    ref: 'Consolidare fiscală (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-property-tax-real-market-value',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: impozit pe proprietate corelat cu valoarea reală din piață (jalon PNRR).',
    ref: 'Ordine în finanțele publice / Consolidare fiscală (p. 2, p. 5)',
  },
  {
    slug: 'gov-program-2025-06-vat-two-rates',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: reașezarea TVA la două cote (consolidare fiscală).',
    ref: 'Consolidare fiscală (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-raise-excises',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: creșterea accizelor (consolidare fiscală).',
    ref: 'Consolidare fiscală (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-ecological-tax-pnrr',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: introducerea unei taxe ecologice (jalon PNRR).',
    ref: 'Consolidare fiscală (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-update-rovinieta-tax',
    topic: 'infrastructure',
    impact_level: 'medium',
    text: 'Program de guvernare: actualizarea taxei de rovinietă (consolidare fiscală).',
    ref: 'Consolidare fiscală (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-gambling-tax-and-decentralize-authorization',
    topic: 'taxes',
    impact_level: 'high',
    text: 'Program de guvernare: taxare suplimentară a jocurilor de noroc/pariuri și a tranzacțiilor bancare asociate; descentralizarea autorizării și taxării către autoritățile locale.',
    ref: 'Creșterea veniturilor / Combaterea evaziunii (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-tax-crypto-and-stock-gains',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: taxarea câștigurilor din criptomonede și a celor de la bursă.',
    ref: 'Creșterea veniturilor / Combaterea evaziunii (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-tax-short-term-rentals',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: taxarea închirierii proprietăților pe termen scurt.',
    ref: 'Creșterea veniturilor / Combaterea evaziunii (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-tax-social-media-platform-income',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: taxarea veniturilor de pe platformele social media.',
    ref: 'Creșterea veniturilor / Combaterea evaziunii (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-remove-vat-facilities-real-estate-transactions',
    topic: 'taxes',
    impact_level: 'medium',
    text: 'Program de guvernare: eliminarea facilităților de TVA la tranzacțiile imobiliare.',
    ref: 'Creșterea veniturilor / Combaterea evaziunii (p. 5)',
  },
  {
    slug: 'gov-program-2025-06-reform-central-administration-mergers-cuts',
    topic: 'transparency',
    impact_level: 'high',
    text: 'Program de guvernare: fuziuni/comasări/desființări și reduceri de personal în administrația centrală (ministere/agenții).',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-eliminate-aberrant-bonuses',
    topic: 'economy',
    impact_level: 'medium',
    text: 'Program de guvernare: eliminarea sporurilor considerate exagerate și aplicarea unei grile de salarizare unitare în sectorul public.',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-performance-criteria-ministry-evaluation',
    topic: 'transparency',
    impact_level: 'medium',
    text: 'Program de guvernare: introducerea de criterii clare de performanță și evaluare periodică pentru fiecare minister și agenție.',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-reform-state-owned-enterprises-close-lossmakers',
    topic: 'economy',
    impact_level: 'high',
    text: 'Program de guvernare: închiderea companiilor de stat cu pierderi cronice și reducerea drastică a posturilor politizate.',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-list-more-state-companies-on-stock-exchange',
    topic: 'economy',
    impact_level: 'medium',
    text: 'Program de guvernare: listarea la bursă a mai multor companii de stat.',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-state-owned-enterprises-audit-assets',
    topic: 'transparency',
    impact_level: 'medium',
    text: 'Program de guvernare: audituri ale activelor companiilor de stat pentru valorificare/transfer către administrații locale sau investitori.',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-reform-self-funded-authorities-salary-caps',
    topic: 'economy',
    impact_level: 'medium',
    text: 'Program de guvernare: plafonarea salariilor și reducerea personalului de suport în autorități autofinanțate (ex. ANCOM, ASF).',
    ref: 'Bună guvernare (p. 3)',
  },
  {
    slug: 'gov-program-2025-06-hospital-beds-reduce-continuous-hospitalization',
    topic: 'healthcare',
    impact_level: 'high',
    text: 'Program de guvernare: reducerea numărului de paturi cu spitalizare continuă acolo unde nu sunt justificate.',
    ref: 'Respect pentru cetățeni / Sistem sanitar (p. 4) + Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-private-cnas-contract-80-percent-fulltime-staff',
    topic: 'healthcare',
    impact_level: 'high',
    text: 'Program de guvernare: contractele CNAS cu furnizorii privați vor impune ca minimum 80% din personal să fie angajat propriu cu normă întreagă.',
    ref: 'Respect pentru cetățeni (p. 4) + Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-cass-base-plus-20-percent-remove-exemptions',
    topic: 'healthcare',
    impact_level: 'high',
    text: 'Program de guvernare: creșterea cu 20% a bazei de contribuabili CASS prin eliminarea excepțiilor și aplicarea CASS la pensiile mari.',
    ref: 'Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-stop-fake-sick-leaves-sanctions',
    topic: 'healthcare',
    impact_level: 'medium',
    text: 'Program de guvernare: reglementarea concediilor medicale și sancțiuni pentru acordarea de concedii medicale fictive.',
    ref: 'Performanță mai bună în sănătate (p. 8) + Mai mulți angajați în economie (p. 8–9)',
  },
  {
    slug: 'gov-program-2025-06-health-hospitals-performance-contracts',
    topic: 'healthcare',
    impact_level: 'medium',
    text: 'Program de guvernare: contracte de performanță pentru spitale și plata medicilor în funcție de performanță.',
    ref: 'Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-health-reduce-centers-of-permanence-urban',
    topic: 'healthcare',
    impact_level: 'medium',
    text: 'Program de guvernare: reducerea centrelor de permanență din mediul urban.',
    ref: 'Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-health-convert-low-occupancy-units-to-ambulatory',
    topic: 'healthcare',
    impact_level: 'medium',
    text: 'Program de guvernare: convertirea unităților sanitare cu grad redus de ocupare în ambulatorii sau spitale de recuperare și paleație.',
    ref: 'Performanță mai bună în sănătate (p. 8)',
  },
  {
    slug: 'gov-program-2025-06-pensions-special-magistrates-retire-65',
    topic: 'pensions',
    impact_level: 'high',
    text: 'Program de guvernare: creșterea vârstei de pensionare a magistraților la 65 de ani.',
    ref: 'Reforma pensiilor speciale (p. 9)',
  },
  {
    slug: 'gov-program-2025-06-pensions-special-limit-noncontributory-gains',
    topic: 'pensions',
    impact_level: 'high',
    text: 'Program de guvernare: limitarea câștigurilor din pensiile necontributive.',
    ref: 'Reforma pensiilor speciale (p. 9)',
  },
]

export function recordContextProvenance(): string {
  return [
    `Sursă primară (PDF oficial, engleză): ${GOVERNMENT_PROGRAM_PDF_EN_URL}`,
    `Copie PDF în română (mirror public): ${GOVERNMENT_PROGRAM_PDF_RO_URL}`,
    `Versiune fișier gov.ro (Last-Modified indicativ): 2025-07-30; dimensiune verificată: ${GOVERNMENT_PROGRAM_PDF_EN_BYTES} octeți.`,
    `Textul român al programului coaliției este asociat datei de adoptare raportate ${GOVERNMENT_PROGRAM_ADOPTED_DATE}; pentru citare în română, folosiți documentul arhivat/agreat de Guvern sau Camera Deputaților.`,
  ].join('\n')
}
