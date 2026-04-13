import type { BlindPayload } from './blind-types'

export function buildBlindUserPrompt(payload: BlindPayload): string {
  const tier1 = payload.sources.filter(s => s.tier <= 1)
  const tier2 = payload.sources.filter(s => s.tier === 2)
  return `
STATEMENT TYPE: ${payload.type.toUpperCase()}
DATE MADE: ${payload.date}

STATEMENT TEXT:
"${payload.statement}"

SOURCES PROVIDED (${payload.sources.length} total — ${tier1.length} Tier-1, ${tier2.length} Tier-2):

${payload.sources
  .map(
    (s, i) => `
SOURCE ${i + 1} [TIER ${s.tier}]${s.lean ? ` [${String(s.lean).toUpperCase()}]` : ''} — ${s.outlet}
URL: ${s.url}
Published: ${s.publishedAt ?? 'unknown'}
Title: ${s.title ?? 'N/A'}
Excerpt: ${s.excerpt ?? 'No excerpt available'}
`
  )
  .join('\n')}

Analyze the above and return your verdict as JSON.
Remember: FALSE requires 2+ independent Tier-1 sources or 1 Tier-1 + 1 official record.
`.trim()
}
