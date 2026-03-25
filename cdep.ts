/**
 * packages/scraper/src/cdep.ts
 * Tevad.ro — cdep.ro deputy scraper
 *
 * Scrapes the Camera Deputaților (cdep.ro) to build/sync
 * the politicians table with all 331 active deputies.
 *
 * Run: npx tsx packages/scraper/src/cdep.ts
 * Cron: daily at 02:00 UTC
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CDEP_BASE = 'https://www.cdep.ro'
const CURRENT_LEG = '2024' // Update each legislature

interface Deputy {
  cdepId: string
  name: string
  slug: string
  party: string
  partyShort: string
  constituency: string
  mandateStart: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[șşŞŠ]/g, 's')
    .replace(/[țţŢŤ]/g, 't')
    .replace(/[ăâÂĂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Avatar color map by party
const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  PSD:   { bg: '#2a0d1e', text: '#f04545' },
  PNL:   { bg: '#0d2a4a', text: '#378ADD' },
  USR:   { bg: '#0d2a1a', text: '#22c97a' },
  AUR:   { bg: '#2a1e0d', text: '#f5a623' },
  UDMR:  { bg: '#1a1a2a', text: '#a78bfa' },
  PMP:   { bg: '#1a0d0d', text: '#f04545' },
  IND:   { bg: '#1a1a1a', text: '#7a94b8' },
}

function partyColors(partyShort: string) {
  return PARTY_COLORS[partyShort] ?? PARTY_COLORS.IND
}

async function fetchDeputyList(): Promise<Deputy[]> {
  console.log(`[cdep] Fetching deputy list for legislature ${CURRENT_LEG}...`)

  // cdep.ro structure URL for current legislature
  const url = `${CDEP_BASE}/pls/parlam/structura2015.de?leg=${CURRENT_LEG}&idl=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Tevad.ro Data Pipeline (contact: open@tevad.ro)' },
  })

  if (!res.ok) throw new Error(`cdep.ro returned ${res.status}`)

  const html = await res.text()
  const deputies: Deputy[] = []

  // Parse deputy rows from HTML table
  // cdep.ro uses a consistent table structure with deputy links
  const rowRegex = /<a href="\/pls\/parlam\/structura2015\.mp\?idm=(\d+)&[^"]*"[^>]*>([^<]+)<\/a>/g
  const partyRegex = /title="([^"]+)"[^>]*class="grup-parlamentar/g

  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const cdepId = match[1]
    const rawName = match[2].trim()

    if (!rawName || rawName.length < 3) continue

    // Extract party from nearby context (simplified — full parse in production)
    const partyMatch = html.substring(match.index, match.index + 500).match(/\(([A-Z]{2,5})\)/)
    const partyShort = partyMatch?.[1] ?? 'IND'

    deputies.push({
      cdepId,
      name: rawName,
      slug: `${slugify(rawName)}-dep`,
      party: partyShort, // Full party name fetched in detail pass
      partyShort,
      constituency: '',
      mandateStart: `${CURRENT_LEG}-12-01`,
    })
  }

  console.log(`[cdep] Found ${deputies.length} deputies`)
  return deputies
}

async function upsertDeputy(deputy: Deputy): Promise<void> {
  const colors = partyColors(deputy.partyShort)

  const { error } = await supabase.from('politicians').upsert(
    {
      slug: deputy.slug,
      name: deputy.name,
      role: 'Deputat',
      party: deputy.party,
      party_short: deputy.partyShort,
      chamber: 'deputat',
      constituency: deputy.constituency,
      mandate_start: deputy.mandateStart,
      is_active: true,
      cdep_id: deputy.cdepId,
      avatar_color: colors.bg,
      avatar_text_color: colors.text,
    },
    { onConflict: 'slug', ignoreDuplicates: false }
  )

  if (error) {
    console.error(`[cdep] Failed to upsert ${deputy.name}:`, error.message)
  } else {
    console.log(`[cdep] ✓ ${deputy.name} (${deputy.partyShort})`)
  }
}

async function run() {
  console.log('[cdep] Starting Camera Deputaților scrape...')
  console.log(`[cdep] Target: ${CDEP_BASE}`)

  const deputies = await fetchDeputyList()

  if (deputies.length === 0) {
    console.warn('[cdep] No deputies found — check cdep.ro HTML structure')
    process.exit(1)
  }

  // Upsert in batches of 10 to avoid rate limiting
  const batchSize = 10
  for (let i = 0; i < deputies.length; i += batchSize) {
    const batch = deputies.slice(i, i + batchSize)
    await Promise.all(batch.map(upsertDeputy))

    // Polite delay between batches
    if (i + batchSize < deputies.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`[cdep] Done. ${deputies.length} deputies synced.`)
}

run().catch(e => {
  console.error('[cdep] Fatal error:', e)
  process.exit(1)
})
