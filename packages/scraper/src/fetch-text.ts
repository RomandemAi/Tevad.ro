/**
 * Longer connect/body timeouts than Node's default fetch (helps cdep.ro / senat.ro).
 */
import { Agent, fetch as undiciFetch } from 'undici'

const agent = new Agent({
  connectTimeout: 90_000,
  bodyTimeout: 180_000,
  headersTimeout: 120_000,
})

export type FetchTextOptions = {
  headers?: Record<string, string>
  timeout?: number
}

function normalizeHeaders(h?: Record<string, string>): Record<string, string> {
  return {
    'user-agent':
      'Mozilla/5.0 (compatible; teVad.ro/1.0; +https://tevad.ro) AppleWebKit/537.36 (KHTML, like Gecko)',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...(h ?? {}),
  }
}

export async function fetchText(
  url: string,
  headersOrOptions: Record<string, string> | FetchTextOptions = {}
): Promise<string> {
  const options: FetchTextOptions =
    headersOrOptions && typeof headersOrOptions === 'object' && 'headers' in headersOrOptions
      ? (headersOrOptions as FetchTextOptions)
      : ({ headers: headersOrOptions as Record<string, string> } satisfies FetchTextOptions)

  const timeout = typeof options.timeout === 'number' && options.timeout > 0 ? options.timeout : undefined
  const signal = timeout ? AbortSignal.timeout(timeout) : undefined

  const res = await undiciFetch(url, {
    dispatcher: agent,
    headers: normalizeHeaders(options.headers),
    redirect: 'follow',
    signal,
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

export async function fetchFormText(
  url: string,
  body: URLSearchParams,
  headers: Record<string, string> = {}
): Promise<string> {
  const res = await undiciFetch(url, {
    dispatcher: agent,
    method: 'POST',
    headers: {
      ...normalizeHeaders(headers),
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      origin: new URL(url).origin,
      referer: url,
    },
    body,
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

export async function fetchBuffer(url: string, headers: Record<string, string>): Promise<Buffer> {
  const res = await undiciFetch(url, {
    dispatcher: agent,
    headers,
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await undiciFetch(url, {
    dispatcher: agent,
    headers,
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return (await res.json()) as T
}
