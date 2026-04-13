export type RecordStatus = 'true' | 'false' | 'partial' | 'pending'
export type RecordType = 'promise' | 'statement' | 'vote'

const DETAIL_MAX = 180

function truncateDetail(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= DETAIL_MAX) return t
  return `${t.slice(0, DETAIL_MAX)}…`
}

export interface StatusHintInput {
  status: RecordStatus
  type: RecordType
  opinion_exempt?: boolean | null
  ai_reasoning?: string | null
}

export interface StatusHint {
  /** Show info control only when non-null */
  show: boolean
  summary: string
  detail?: string
}

/**
 * User-facing explanation for verdict badge (pending / partial focus).
 */
export function getStatusHint(input: StatusHintInput): StatusHint {
  const { status, type, opinion_exempt, ai_reasoning } = input
  const reasoning = ai_reasoning?.trim()

  if (opinion_exempt) {
    return {
      show: true,
      summary: 'Declarație politică — verdictul nu se aplică opiniilor',
    }
  }

  if (status === 'pending' && type === 'promise') {
    return {
      show: true,
      summary:
        'Promisiune în curs de verificare — verdictul devine disponibil când există dovezi clare de implementare sau surse noi relevante.',
    }
  }

  if (status === 'pending' && type === 'statement') {
    return {
      show: true,
      summary: 'Verificare în curs — verdictul final nu este încă stabilit.',
      ...(reasoning ? { detail: truncateDetail(reasoning) } : {}),
    }
  }

  if (status === 'pending' && type === 'vote') {
    return {
      show: true,
      summary: 'Verificare în curs — verdictul final nu este încă stabilit.',
      ...(reasoning ? { detail: truncateDetail(reasoning) } : {}),
    }
  }

  if (status === 'partial') {
    return {
      show: true,
      summary: 'Verdict parțial — sursele publice susțin doar o parte din afirmație.',
      ...(reasoning ? { detail: truncateDetail(reasoning) } : {}),
    }
  }

  return { show: false, summary: '' }
}
