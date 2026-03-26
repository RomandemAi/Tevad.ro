/**
 * packages/scraper/src/senat.ts
 * Tevad.ro — senat.ro senator scraper
 *
 * Scrapes Senatul României (senat.ro) to build/sync
 * the politicians table with all 136 active senators.
 *
 * Run: npx tsx packages/scraper/src/senat.ts
 * Cron: daily at 03:00 UTC
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENAT_BASE = 'https://www.senat.ro'
const CURRENT_LEG = '2024'

interface Senator {
  senatId: string
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

async function fetchSenatorList(): Promise<Senator[]> {
  console.log(`[senat] Fetching senator list for legislature ${CURRENT_LEG}...`)

  // senat.ro senator list endpoint
  const url = `${SENAT_BASE}/ro/pag/senatori.html`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Tevad.ro Data Pipeline (contact: open@tevad.ro)' },
  })

  if (!res.ok) throw new Error(`senat.ro returned ${res.status}`)

  const html = await res.text()
  const senators: Senator[] = []

  // Parse senator rows — senat.ro uses senator profile links
  const rowRegex = /href="[^"]*senator[^"]*?id=(\d+)[^"]*"[^>]*>([^<]+)<\/a>/gi

  let match
  const seen = new Set<string>()

  while ((match = rowRegex.exec(html)) !== null) {
    const senatId = match[1]
    const rawName = match[2].trim()

    if (!rawName || rawName.length < 3) continue
    if (seen.has(senatId)) continue
    seen.add(senatId)

    // Extract party from nearby context
    const partyMatch = html.substring(match.index, match.index + 600).match(/\(([A-Z]{2,5})\)/)
    const partyShort = partyMatch?.[1] ?? 'IND'

    senators.push({
      senatId,
      name: rawName,
      slug: `${slugify(rawName)}-sen`,
      party: partyShort,
      partyShort,
      constituency: '',
      mandateStart: `${CURRENT_LEG}-12-01`,
    })
  }

  console.log(`[senat] Found ${senators.length} senators`)
  return senators
}

async function upsertSenator(senator: Senator): Promise<void> {
  const colors = partyColors(senator.partyShort)

  const { error } = await supabase.from('politicians').upsert(
    {
      slug: senator.slug,
      name: senator.name,
      role: 'Senator',
      party: senator.party,
      party_short: senator.partyShort,
      chamber: 'senator',
      constituency: senator.constituency,
      mandate_start: senator.mandateStart,
      is_active: true,
      senat_id: senator.senatId,
      avatar_color: colors.bg,
      avatar_text_color: colors.text,
    },
    { onConflict: 'slug', ignoreDuplicates: false }
  )

  if (error) {
    console.error(`[senat] Failed to upsert ${senator.name}:`, error.message)
  } else {
    console.log(`[senat] ✓ ${senator.name} (${senator.partyShort})`)
  }
}

async function run() {
  console.log('[senat] Starting Senatul României scrape...')
  console.log(`[senat] Target: ${SENAT_BASE}`)

  const senators = await fetchSenatorList()

  if (senators.length === 0) {
    console.warn('[senat] No senators found — check senat.ro HTML structure')
    process.exit(1)
  }

  const batchSize = 10
  for (let i = 0; i < senators.length; i += batchSize) {
    const batch = senators.slice(i, i + batchSize)
    await Promise.all(batch.map(upsertSenator))

    if (i + batchSize < senators.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`[senat] Done. ${senators.length} senators synced.`)
}

run().catch(e => {
  console.error('[senat] Fatal error:', e)
  process.exit(1)
})
