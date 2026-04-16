/** Presentation only — DB still uses status true|false|partial|pending for all types. */

export type RecordVerdictType = 'promise' | 'statement' | 'vote'
export type RecordVerdictStatus = 'true' | 'false' | 'partial' | 'pending'

/** Short uppercase label for the status pill (type-specific Romanian). */
export function verdictBadgeLabel(type: RecordVerdictType, status: RecordVerdictStatus): string {
  if (type === 'statement') {
    switch (status) {
      case 'true':
        return 'DECL. CONFIRMATĂ'
      case 'false':
        return 'DECL. INFIRMATĂ'
      case 'partial':
        return 'PARȚIAL'
      case 'pending':
        return 'PENDING'
    }
  }
  if (type === 'promise') {
    switch (status) {
      case 'true':
        return 'ÎNDEPLINITĂ'
      case 'false':
        return 'NEÎNDEPLINITĂ'
      case 'partial':
        return 'PARȚIAL ÎNDEPL.'
      case 'pending':
        return 'PENDING'
    }
  }
  switch (status) {
    case 'true':
      return 'ADEVĂRAT'
    case 'false':
      return 'FALS'
    case 'partial':
      return 'PARȚIAL'
    case 'pending':
      return 'PENDING'
  }
}

/** One-line explanation for tooltips / StatusHintIcon (resolved verdicts). */
export function verdictMeaningSummary(type: RecordVerdictType, status: RecordVerdictStatus): string {
  if (type === 'statement') {
    if (status === 'true') {
      return 'Declarație confirmată de surse — nu înseamnă promisiune îndeplinită.'
    }
    if (status === 'false') {
      return 'Declarație infirmată de surse (contrazisă sau neconfirmată).'
    }
    if (status === 'partial') {
      return 'Sursele publice susțin doar o parte din afirmație.'
    }
  }
  if (type === 'promise') {
    if (status === 'true') {
      return 'Angajamentul este susținut de surse ca fiind îndeplinit sau respectat în practică.'
    }
    if (status === 'false') {
      return 'Angajamentul nu este susținut de surse ca fiind îndeplinit.'
    }
    if (status === 'partial') {
      return 'Sursele confirmă doar o parte din îndeplinirea promisiunii.'
    }
  }
  if (type === 'vote') {
    if (status === 'true') return 'Înregistrarea votului este confirmată de sursele citate.'
    if (status === 'false') return 'Înregistrarea votului este contrazisă sau neconfirmată de surse.'
    if (status === 'partial') return 'Sursele susțin doar parțial descrierea votului.'
  }
  return ''
}
