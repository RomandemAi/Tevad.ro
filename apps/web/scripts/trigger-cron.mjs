/**
 * Hit a /api/cron/* route like Vercel/Netlify would (Bearer CRON_SECRET).
 * Usage: node ./scripts/trigger-cron.mjs [path]
 * Example: node ./scripts/trigger-cron.mjs /api/cron/rss-watch
 */
import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const webRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const repoRoot = path.resolve(webRoot, '..', '..')

loadEnvConfig(repoRoot)
loadEnvConfig(webRoot)

const pathname = (process.argv[2] || '/api/cron/rss-watch').startsWith('/')
  ? process.argv[2] || '/api/cron/rss-watch'
  : `/${process.argv[2]}`

const secret = process.env.CRON_SECRET
// Local dev default 3001 (see package.json dev). Set CRON_TRIGGER_URL to hit staging/prod.
const base = (process.env.CRON_TRIGGER_URL || 'http://localhost:3001').replace(/\/$/, '')

if (!secret) {
  console.error('Missing CRON_SECRET. Add it to .env.local (repo root or apps/web).')
  process.exit(1)
}

const url = new URL(pathname, `${base}/`)

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
})

const text = await res.text()
console.log(`${res.status} ${url.href}`)
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text)
}

if (!res.ok) process.exit(1)
