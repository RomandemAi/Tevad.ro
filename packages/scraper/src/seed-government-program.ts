/**
 * One-off / rare: attach curated Government Programme 2025–2028 promises to the active Prim-ministru.
 * Run: npm run seed-program -w @tevad/scraper
 *
 * Idempotent: skips rows whose slug already exists.
 */

import { createServiceClient } from './supabase-env'
import {
  GOVERNMENT_PROGRAM_PDF_EN_URL,
  PROGRAM_SEED_PROMISES,
  recordContextProvenance,
} from './government-program-source'

async function main() {
  const supabase = createServiceClient()

  const { data: premier, error: pErr } = await supabase
    .from('politicians')
    .select('id, slug, name')
    .eq('chamber', 'premier')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (pErr) {
    console.error('[seed-program]', pErr.message)
    process.exit(1)
  }
  if (!premier) {
    console.warn('[seed-program] No active premier (chamber=premier). Nothing to do.')
    process.exit(0)
  }

  console.log('[seed-program] Premier:', premier.slug, premier.name)

  const ctx = recordContextProvenance()

  for (const row of PROGRAM_SEED_PROMISES) {
    const { data: existing } = await supabase.from('records').select('id').eq('slug', row.slug).maybeSingle()
    if (existing) {
      console.log('[seed-program] Skip (exists):', row.slug)
      continue
    }

    const { data: rec, error: iErr } = await supabase
      .from('records')
      .insert({
        politician_id: premier.id,
        slug: row.slug,
        type: 'promise',
        text: row.text,
        context: ctx,
        topic: row.topic,
        status: 'pending',
        date_made: '2025-06-23',
        impact_level: row.impact_level,
      })
      .select('id')
      .single()

    if (iErr) {
      console.error('[seed-program] Insert', row.slug, iErr.message)
      continue
    }

    const { error: sErr } = await supabase.from('sources').insert({
      record_id: rec.id,
      tier: '0',
      outlet: 'Guvernul României (gov.ro)',
      url: GOVERNMENT_PROGRAM_PDF_EN_URL,
      title: 'Government Programme 2025–2028 (official PDF, EN)',
      published_at: '2025-06-23',
    })

    if (sErr) console.error('[seed-program] Source', row.slug, sErr.message)
    else console.log('[seed-program] Inserted', row.slug)
  }

  console.log('[seed-program] Done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
