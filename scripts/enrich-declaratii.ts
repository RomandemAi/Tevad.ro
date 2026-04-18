/**
 * Manually enrich declarații: run RSS feed-watcher (Haiku → verification_queue), optionally drain queue → records.
 *
 * Repo root, with `.env` and/or `apps/web/.env.local` containing:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, XAI_API_KEY
 *
 * Usage:
 *   npx tsx scripts/enrich-declaratii.ts
 *   npx tsx scripts/enrich-declaratii.ts --cycles=4 --drain=8
 *
 * Env overrides (optional):
 *   RSS_ENRICH_BATCH=5 RSS_ENRICH_ITEMS=22 RSS_ENRICH_CLASSIFY=28
 */
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

{
  const repoRoot = process.cwd()
  for (const p of [path.join(repoRoot, '.env'), path.join(repoRoot, 'apps', 'web', '.env.local')]) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false })
  }
}

function argNum(name: string, fallback: number): number {
  const raw = process.argv.find(a => a.startsWith(`${name}=`))?.slice(name.length + 1)
  const n = raw != null ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

async function main() {
  const cycles = argNum('--cycles', 6)
  const drain = argNum('--drain', 0)
  const batch = Math.min(8, Math.max(1, Number(process.env.RSS_ENRICH_BATCH) || 6))
  const items = Math.min(40, Math.max(5, Number(process.env.RSS_ENRICH_ITEMS) || 25))
  const classify = Math.min(80, Math.max(8, Number(process.env.RSS_ENRICH_CLASSIFY) || 45))
  const excerpts = Math.min(8, Math.max(0, Number(process.env.RSS_ENRICH_EXCERPTS) || 5))

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error('[enrich-declaratii] Missing ANTHROPIC_API_KEY in .env / apps/web/.env.local')
    process.exit(1)
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error('[enrich-declaratii] Missing SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const { run: rssRun } = await import('../packages/rss-monitor/src/feed-watcher.ts')

  const baseWindow = Number(process.env.RSS_WINDOW_INDEX ?? '') || Math.floor(Date.now() / (30 * 60 * 1000))

  console.log(`[enrich-declaratii] RSS cycles=${cycles} batch=${batch} items=${items} classify=${classify} excerpts=${excerpts}`)
  for (let i = 0; i < cycles; i++) {
    process.env.RSS_WINDOW_INDEX = String(baseWindow + i + 1)
    console.log(`\n[enrich-declaratii] ── cycle ${i + 1}/${cycles} (RSS_WINDOW_INDEX=${process.env.RSS_WINDOW_INDEX})`)
    const summary = await rssRun({ batchSize: batch, maxItemsPerFeed: items, maxClassifyCalls: classify, maxExcerptFetches: excerpts })
    if (summary) {
      console.log('[enrich-declaratii] summary:', JSON.stringify(summary))
    } else {
      console.warn('[enrich-declaratii] RSS run returned no summary (check ANTHROPIC / politicians).')
    }
  }

  if (drain > 0) {
    if (!process.env.XAI_API_KEY?.trim()) {
      console.error('[enrich-declaratii] --drain requires XAI_API_KEY')
      process.exit(1)
    }
    const { run: drainRun } = await import('../packages/rss-monitor/src/drain-queue.ts')
    console.log(`\n[enrich-declaratii] Draining verification_queue (limit=${drain})…`)
    const out = await drainRun({ limit: drain })
    console.log('[enrich-declaratii] drain:', JSON.stringify(out))
  } else {
    console.log('\n[enrich-declaratii] Skip drain (pass --drain=N to verify N queue rows locally).')
  }

  console.log('\n[enrich-declaratii] Done. On production, hit /api/cron/rss-watch then /api/cron/verify with CRON_SECRET.')
}

main().catch(e => {
  console.error('[enrich-declaratii]', e)
  process.exit(1)
})
