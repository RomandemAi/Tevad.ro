/**
 * packages/scraper/src/x-handles.ts — Discover & store X (Twitter) handles for politicians.
 *
 * Phase 1: seed known handles from a curated map (major Romanian politicians).
 * Phase 2: for remaining politicians, search DuckDuckGo and use Claude Haiku to
 *           identify the likely official handle from search snippets.
 *
 * Run:
 *   npm run x:handles              — seed known + auto-discover rest
 *   npm run x:handles -- --seed-only   — only apply the curated seed map
 *   npm run x:handles -- --dry-run     — print what would change, don't write
 */

import { createServiceClient } from './supabase-env'
import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const SEED_HANDLES: Record<string, string> = {
  // Format: 'politician-slug': 'XHandle'
  'george-simion-presedinte':        'georgesimion',
  'george-simion':                   'georgesimion',
  'catalin-drula':                   'CatalinDrula',
  'dan-barna':                       'DanBarna',
  'nicusor-dan-presedinte':          'NicusorDan',
  'nicusor-dan':                     'NicusorDan',
  'elena-lasconi':                   'ElenaLasconi',
  'victor-ponta':                    'VictorVPonta',
  'crin-antonescu-presedinte':       'CrinAntonescu',
  'ilie-bolojan-premier':            'IlieBolojan',
  'ilie-bolojan':                    'IlieBolojan',
  'rares-bogdan':                    'RaresBogdan',
  'vlad-voiculescu':                 'vladvoiculescu',
  'clotilde-armand':                 'ClotildeArmand',
  'dominic-fritz':                   'DominicFritz',
  'robert-sighiartau':               'RSighiartau',
  'sebastian-burduja':               'sebi_burduja',
  'cristian-ghinea':                 'cristi_ghinea',
  'oana-bjosen':                     'OanaBjosen',
  'tudor-pacuraru':                  'TudorPacuraru',
  'bogdan-ivan':                     'BogdanIvanRO',
  'marian-neacsu':                   'MarianNeacsuPSD',
  'alfred-simonis':                  'AlfredSimonis',
  'sorin-grindeanu':                 'SorinGrindeanu',
  'marcel-ciolacu':                  'MarcelCiolacu',
  'mihai-fifor':                     'MihaiFifor',
  'gabriel-les':                     'GabrielLes',
  'mihai-ghimpu':                    'MihaiGhimpu',
  'andrei-caramitru':                'acaramitru',
  'ludovic-orban':                   'LudovicOrban',
  'florin-citu':                     'florincitu',
  'kelemen-hunor':                   'KelemenHunor',
  'mircea-geoana':                   'MirceaGeoana',
  'teodor-melescanu':                'TeoMelescanu',
  'ciprian-ciucu':                   'ciprian_ciucu',
  'razvan-pop':                      'RazvanPopUSR',
  'catalin-tenielu':                 'TenelucCatalin',
  'dan-motreanu':                    'DanMotreanu',
  'vasile-blaga':                    'VasileBlaga',
  'dragos-pislaru':                  'DragosPislaru',
  'marian-minut':                    'MarianMinutPSD',
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function normalizeHandle(raw: string): string | null {
  const h = raw.replace(/^@/, '').trim()
  if (!/^[A-Za-z0-9_]{1,50}$/.test(h)) return null
  return h
}

async function searchDuckDuckGo(query: string): Promise<string> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TeVad.ro/1.0; +https://tevad.ro)',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    // Extract result snippets — strip HTML tags
    const snippets = [...html.matchAll(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .slice(0, 5)
      .join('\n')
    const titles = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .slice(0, 5)
      .join('\n')
    return `Titles:\n${titles}\n\nSnippets:\n${snippets}`.slice(0, 1500)
  } catch {
    return ''
  }
}

async function discoverHandle(name: string, party: string, anthropic: Anthropic): Promise<string | null> {
  // Try multiple search queries to maximize chances of finding an X handle
  const queries = [
    `"${name}" site:x.com Romania`,
    `"${name}" twitter.com Romania ${party}`,
    `"${name}" parlamentar Romania twitter`,
  ]

  let bestResults = ''
  for (const query of queries) {
    const res = await searchDuckDuckGo(query)
    if (res.length > bestResults.length) bestResults = res
    if (res.match(/@[A-Za-z0-9_]{3,}|x\.com\/[A-Za-z0-9_]{3,}/)) break
    await sleep(500)
  }
  if (!bestResults) return null

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [{
      role: 'user',
      content: `Identify the official X (Twitter) handle of this Romanian politician.

Politician: ${name} (party: ${party})
Search results:
${bestResults}

Reply with ONLY the X handle (without @) if clearly identified as this specific person's official account.
Reply "null" if uncertain.`,
    }],
  })

  const raw = (msg.content[0] as { text: string }).text.trim()
  if (raw.toLowerCase() === 'null' || raw.toLowerCase() === 'none') return null
  // Also extract from URLs like x.com/SomeName or twitter.com/SomeName
  const urlMatch = bestResults.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{3,50})(?:\/|$|\s)/i)
  const fromUrl = urlMatch ? normalizeHandle(urlMatch[1]!) : null
  const fromClaude = normalizeHandle(raw.split(/[\s\n]/)[0]!)
  // Prefer the URL match if Claude's answer matches it
  if (fromUrl && fromClaude && fromUrl.toLowerCase() === fromClaude.toLowerCase()) return fromUrl
  return fromClaude
}

async function main() {
  const seedOnly = process.argv.includes('--seed-only')
  const dryRun = process.argv.includes('--dry-run')

  const supabase = createServiceClient()

  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, slug, name, party_short, x_handle')
    .eq('is_active', true)
    .order('slug')

  if (error || !politicians) {
    console.error('[x-handles] Failed to load politicians:', error?.message)
    process.exit(1)
  }

  console.log(`[x-handles] Loaded ${politicians.length} active politicians`)

  let seeded = 0
  let discovered = 0
  let unchanged = 0

  // Phase 1: apply seed map
  for (const pol of politicians) {
    const known = SEED_HANDLES[pol.slug]
    if (!known) continue
    if (pol.x_handle === known) { unchanged++; continue }
    console.log(`[x-handles] SEED  ${pol.slug} → @${known}`)
    if (!dryRun) {
      await supabase.from('politicians').update({ x_handle: known }).eq('id', pol.id)
    }
    seeded++
  }

  if (seedOnly) {
    console.log(`[x-handles] Seed-only done. seeded=${seeded} unchanged=${unchanged}`)
    return
  }

  // Phase 2: auto-discover for remaining politicians without handles
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.warn('[x-handles] ANTHROPIC_API_KEY not set — skipping auto-discovery')
    return
  }
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const needDiscovery = politicians.filter(p => !p.x_handle && !SEED_HANDLES[p.slug])
  console.log(`[x-handles] Auto-discovering ${needDiscovery.length} politicians without handles...`)

  for (const pol of needDiscovery) {
    await sleep(1500)
    const handle = await discoverHandle(pol.name, pol.party_short ?? '', anthropic)
    if (!handle) {
      console.log(`[x-handles] MISS  ${pol.name}`)
      continue
    }
    console.log(`[x-handles] FOUND ${pol.name} → @${handle}`)
    if (!dryRun) {
      await supabase.from('politicians').update({ x_handle: handle }).eq('id', pol.id)
    }
    discovered++
  }

  console.log(`[x-handles] Done. seeded=${seeded} discovered=${discovered} unchanged=${unchanged}`)
}

main().catch(e => { console.error('[x-handles] Fatal:', e.message); process.exit(1) })
