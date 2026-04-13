import { NextRequest, NextResponse } from 'next/server'

/** Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set in project env. */
export function assertCronSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      {
        error: 'CRON_SECRET not configured',
        hint: 'Add CRON_SECRET to the repo-root .env.local (same place Next loads env) and restart `npm run dev -w web`.',
      },
      { status: 503 }
    )
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        hint:
          'Do not open cron URLs in the browser tab — there is no Bearer token. From the repo root run `npm run cron:rss -w web` while dev is up (default port 3001), or call curl/Postman with header Authorization: Bearer <CRON_SECRET>.',
      },
      { status: 401 }
    )
  }
  return null
}
