/**
 * Claude web_search tool enrichment for verification (shared by verify + resolve-pending).
 */

import Anthropic from '@anthropic-ai/sdk'
import { fetchText } from '../../scraper/src/fetch-text'

export type WebSearchEnrichment = {
  statementDate: string | null
  sources: Array<{ url: string; title?: string; publishedAt?: string | null; excerpt?: string }>
}

function extractJsonObject<T>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0]) as T
    } catch {
      return null
    }
  }
}

function isoDateOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return t
}

export function makeWebQuery(politicianName: string, statementText: string, statementDate: string): string {
  const year = /^\d{4}/.test(statementDate) ? statementDate.slice(0, 4) : new Date().getFullYear().toString()
  const keyword = statementText
    .replace(/[^a-zA-Z0-9ĂÂÎȘȚăâîșț\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(' ')
  return `${politicianName} ${keyword} ${year} Romania`
}

function stripHtmlToExcerpt(html: string, maxChars = 1000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

function redactPoliticianName(text: string, politicianName: string): string {
  const parts = politicianName
    .split(/\s+/)
    .map(p => p.trim())
    .filter(Boolean)
    .filter(p => p.length >= 3)
  let out = text
  for (const p of parts) {
    out = out.replace(new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[REDACTED]')
  }
  return out
}

async function tryFetchExcerpt(url: string, timeoutMs = 10_000): Promise<string | undefined> {
  try {
    const html = await fetchText(url, { timeout: timeoutMs })
    const text = stripHtmlToExcerpt(html, 1000)
    if (!text) return undefined
    return text
  } catch {
    return undefined
  }
}

/** Run web search with an explicit query string (VERIFY_WEB_SEARCH=1). */
export async function enrichWithCustomWebSearchQuery(
  politicianName: string,
  searchQuery: string
): Promise<WebSearchEnrichment> {
  if (process.env.VERIFY_WEB_SEARCH !== '1') return { statementDate: null, sources: [] }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { statementDate: null, sources: [] }

  const client = new Anthropic({ apiKey })

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] as any,
    system:
      'You help a Romanian political accountability system. Return JSON only. ' +
      'Do not include politician names in any output fields.',
    messages: [
      {
        role: 'user',
        content:
          `Use web search for: "${searchQuery}".\n\n` +
          `Return JSON:\n` +
          `{\n  "statementDate": "YYYY-MM-DD" | null,\n  "sources": [ { "url": "...", "title": "...", "publishedAt": "YYYY-MM-DD" | null } ]\n}\n\n` +
          `Rules:\n- Up to 3 sources.\n- URLs must be public.\n- If you can infer the real promise date, set statementDate.\n`,
      },
    ],
  })

  const raw =
    (resp.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n') || ''

  const parsed = extractJsonObject<WebSearchEnrichment>(raw)
  if (!parsed || !Array.isArray(parsed.sources)) return { statementDate: null, sources: [] }

  const sources = (parsed.sources ?? [])
    .map((s: any) => ({
      url: typeof s?.url === 'string' ? s.url : '',
      title: typeof s?.title === 'string' ? s.title : undefined,
      publishedAt: isoDateOrNull(s?.publishedAt),
    }))
    .filter(s => !!s.url)
    .slice(0, 3)

  const fetched = await Promise.allSettled(
    sources.map(async s => {
      const excerpt = await tryFetchExcerpt(s.url, 10_000)
      return { ...s, excerpt: excerpt ? redactPoliticianName(excerpt, politicianName) : undefined }
    })
  )

  const withExcerpts = fetched
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean) as Array<{ url: string; title?: string; publishedAt?: string | null; excerpt?: string }>

  return {
    statementDate: isoDateOrNull((parsed as any).statementDate),
    sources: withExcerpts,
  }
}

export async function enrichWithWebSearch(
  politicianName: string,
  statementText: string,
  statementDate: string
): Promise<WebSearchEnrichment> {
  const query = makeWebQuery(politicianName, statementText, statementDate)
  return enrichWithCustomWebSearchQuery(politicianName, query)
}
