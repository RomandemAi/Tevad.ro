/**
 * packages/scraper/src/bec.ts — BEC locale 2024 (phase 3a: sample / manual seed path)
 * Full portal JSON varies by release; extend when URLs are stable.
 */

import { createServiceClient } from './supabase-env'
import { slugify } from './slugify'
import { partyColors } from './party-colors'

const UA = 'Tevad.ro Data Pipeline (contact: open@tevad.ro)'

export interface BecOfficial {
  bec_id: string
  name: string
  localitate: string
  party_short: string
  chamber: 'primar' | 'presedinte_cj'
}

/** Placeholder batch — replace with real BEC JSON/HTML parser when endpoint is wired. */
export function getPhase3aPlaceholder(): BecOfficial[] {
  return []
}

export async function run(): Promise<{ synced: number; skipped: number; errors: number }> {
  const supabase = createServiceClient()
  console.log('[bec] Phase 3a — loading placeholder list (add BEC JSON parser when ready)')
  const rows = getPhase3aPlaceholder()
  let synced = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const slug = `${slugify(r.name)}-${r.chamber}-${slugify(r.localitate)}`
    const { data: existing } = await supabase.from('politicians').select('id').eq('slug', slug).maybeSingle()
    if (existing) {
      console.log(`[bec] ${String(i + 1).padStart(3, '0')}/${rows.length} ${r.name} → skip (exists)`)
      skipped++
      continue
    }
    const colors = partyColors(r.party_short)
    const { error } = await supabase.from('politicians').upsert(
      {
        slug,
        name: r.name,
        role: r.chamber === 'primar' ? 'Primar' : 'Președinte Consiliu Județean',
        party: r.party_short,
        party_short: r.party_short,
        chamber: r.chamber,
        constituency: r.localitate,
        mandate_start: '2024-06-11',
        is_active: true,
        bec_id: r.bec_id,
        avatar_color: colors.bg,
        avatar_text_color: colors.text,
      },
      { onConflict: 'bec_id' }
    )
    if (error) {
      console.error(`[bec] ${r.name}:`, error.message)
      errors++
    } else {
      synced++
      console.log(`[bec] ✓ ${r.name} (${r.localitate})`)
    }
  }
  console.log(`[bec] Done. ${synced} synced, ${skipped} skipped, ${errors} errors.`)
  return { synced, skipped, errors }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('bec.ts')) {
  run().catch(e => {
    console.error('[bec] Fatal:', e)
    process.exit(1)
  })
}
