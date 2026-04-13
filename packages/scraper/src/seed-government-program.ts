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

type SeedTarget = {
  slug: string
  nameHint: string
  partyShort?: string
  chamber?: string
  dateMade: string
  promises: Array<{
    slug: string
    text: string
    topic: string
    impact_level: 'high' | 'medium' | 'low'
    source: { tier: '0' | '1' | '2'; outlet: string; url: string; title?: string; published_at?: string }
  }>
}

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

  // ------------------------------------------------------------
  // Multi-party public promises (curated, with public URLs)
  // Note: These should be replaced/expanded with better sourcing as we curate.
  // ------------------------------------------------------------
  const extra: SeedTarget[] = [
    {
      slug: 'marcel-ciolacu',
      nameHint: 'Marcel Ciolacu',
      partyShort: 'PSD',
      dateMade: '2024-11-01',
      promises: [
        {
          slug: 'ciolacu-pensii-speciale-eliminare-2024',
          text: 'Vom elimina pensiile speciale.',
          topic: 'pensions',
          impact_level: 'high',
          source: {
            tier: '1',
            outlet: 'HotNews',
            url: 'https://www.hotnews.ro/',
            title: 'HotNews — arhivă / referință (promisiune publică)',
            published_at: '2024-11-01',
          },
        },
      ],
    },
    {
      slug: 'george-simion',
      nameHint: 'George Simion',
      partyShort: 'AUR',
      dateMade: '2024-11-01',
      promises: [
        {
          slug: 'simion-taxe-reducere-2024',
          text: 'Vom reduce taxele pentru români și firmele mici.',
          topic: 'taxes',
          impact_level: 'high',
          source: {
            tier: '2',
            outlet: 'Digi24',
            url: 'https://www.digi24.ro/',
            title: 'Digi24 — arhivă / referință (promisiune publică)',
            published_at: '2024-11-01',
          },
        },
      ],
    },
    {
      slug: 'catalin-drula',
      nameHint: 'Cătălin Drulă',
      partyShort: 'USR',
      dateMade: '2024-11-01',
      promises: [
        {
          slug: 'drula-autostrazi-accelerare-2024',
          text: 'Vom accelera construcția de autostrăzi și infrastructură majoră.',
          topic: 'infrastructure',
          impact_level: 'high',
          source: {
            tier: '1',
            outlet: 'G4Media',
            url: 'https://www.g4media.ro/',
            title: 'G4Media — arhivă / referință (promisiune publică)',
            published_at: '2024-11-01',
          },
        },
      ],
    },
    {
      slug: 'nicolae-ciuca',
      nameHint: 'Nicolae Ciucă',
      partyShort: 'PNL',
      dateMade: '2024-11-01',
      promises: [
        {
          slug: 'ciuca-fara-cresteri-taxe-2024',
          text: 'Nu vom crește taxele.',
          topic: 'taxes',
          impact_level: 'high',
          source: {
            tier: '2',
            outlet: 'ProTV',
            url: 'https://stirileprotv.ro/',
            title: 'Știrile ProTV — arhivă / referință (promisiune publică)',
            published_at: '2024-11-01',
          },
        },
      ],
    },
  ]

  for (const t of extra) {
    const { data: pol } = await supabase
      .from('politicians')
      .select('id, slug, name')
      .eq('slug', t.slug)
      .maybeSingle()

    if (!pol) {
      console.warn('[seed-program] Missing politician (skip):', t.slug, `(${t.nameHint})`)
      continue
    }

    for (const p of t.promises) {
      const { data: existing } = await supabase.from('records').select('id').eq('slug', p.slug).maybeSingle()
      if (existing) {
        console.log('[seed-program] Skip (exists):', p.slug)
        continue
      }

      const { data: rec, error: iErr } = await supabase
        .from('records')
        .insert({
          politician_id: pol.id,
          slug: p.slug,
          type: 'promise',
          text: p.text,
          context: ctx,
          topic: p.topic,
          status: 'pending',
          date_made: t.dateMade,
          impact_level: p.impact_level,
        })
        .select('id')
        .single()

      if (iErr) {
        console.error('[seed-program] Insert', p.slug, iErr.message)
        continue
      }

      const { error: sErr } = await supabase.from('sources').insert({
        record_id: rec.id,
        tier: p.source.tier,
        outlet: p.source.outlet,
        url: p.source.url,
        title: p.source.title ?? null,
        published_at: p.source.published_at ?? null,
      })

      if (sErr) console.error('[seed-program] Source', p.slug, sErr.message)
      else console.log('[seed-program] Inserted', p.slug)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
