import type { BlindPayload, BlindSource, StatementType } from './blind-types'

export function buildBlindPayload(params: {
  statementText: string
  statementDate: string
  statementType: StatementType
  sources: BlindSource[]
}): BlindPayload {
  return {
    statement: params.statementText,
    date: params.statementDate,
    type: params.statementType,
    sources: params.sources,
  }
}
