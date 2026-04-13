/**
 * Netlify scheduled function: calls the Next.js API route /api/cron/rss-watch with Bearer CRON_SECRET.
 * Runs only on production deploys (not deploy previews). Max ~30s per Netlify limits — if RSS often
 * times out, reduce work in the route or use a background pattern.
 */
export default async function handler(req) {
  let nextRun
  try {
    const body = await req.json()
    nextRun = body.next_run
  } catch {
    // manual "Run now" may omit body
  }
  console.log('[cron-rss-watch] tick', nextRun || '(no next_run in body)')

  const base = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET

  if (!base) {
    console.error('[cron-rss-watch] Missing URL (Netlify should set URL)')
    return new Response(JSON.stringify({ ok: false, error: 'URL not set' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (!secret) {
    console.error('[cron-rss-watch] Missing CRON_SECRET')
    return new Response(JSON.stringify({ ok: false, error: 'CRON_SECRET not set in Netlify env' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const target = `${base}/api/cron/rss-watch`
  const upstream = await fetch(target, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(28_000),
  })
  const text = await upstream.text()
  console.log('[cron-rss-watch] upstream', upstream.status, text.slice(0, 1500))

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        upstreamStatus: upstream.status,
        body: text.slice(0, 4000),
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ ok: true, upstreamStatus: upstream.status }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

export const config = {
  schedule: '*/30 * * * *',
}
