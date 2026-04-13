/**
 * Remove duplicate deputat/senator rows after BEC import: same display name,
 * old manual/scraper row vs new BEC row.
 *
 * 1) If column bec_id exists and some duplicates have bec_id set: delete rows
 *    with bec_id IS NULL when another row shares the same name with bec_id set
 *    (matches the user's SQL intent).
 * 2) Else: keep rows with mandate_start = 2024-12-01 (BEC import), delete other
 *    duplicates with the same name.
 *
 * Run: npx tsx packages/scraper/src/cleanup-bec-duplicates.ts
 *      npm run cleanup:bec-duplicates -w @tevad/scraper
 */
import { createServiceClient } from './supabase-env'

const BEC_MANDATE = '2024-12-01'
const CHAMBERS = ['deputat', 'senator'] as const

type Row = {
  id: string
  name: string
  chamber: string
  mandate_start: string | null
  bec_id?: string | null
}

async function fetchAllRows(
  supabase: ReturnType<typeof createServiceClient>,
  select: string
): Promise<{ rows: Row[]; hasBecId: boolean }> {
  const pageSize = 1000
  const rows: Row[] = []
  let from = 0
  let hasBecId = select.includes('bec_id')

  for (;;) {
    const { data, error } = await supabase
      .from('politicians')
      .select(select)
      .in('chamber', [...CHAMBERS])
      .range(from, from + pageSize - 1)

    if (error) {
      if (hasBecId && /bec_id|column/i.test(error.message)) {
        return fetchAllRows(supabase, 'id, name, chamber, mandate_start')
      }
      throw error
    }
    const batch = (data ?? []) as Row[]
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return { rows, hasBecId: select.includes('bec_id') }
}

function idsToDeleteForDuplicates(rows: Row[], hasBecIdColumn: boolean): { ids: string[]; strategy: string } {
  const byName = new Map<string, Row[]>()
  for (const r of rows) {
    const key = r.name.trim()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(r)
  }

  const ids: string[] = []
  let strategy = ''

  for (const [name, list] of byName.entries()) {
    if (list.length < 2) continue

    const anyBec = hasBecIdColumn && list.some(r => r.bec_id != null && String(r.bec_id).trim() !== '')
    if (anyBec) {
      strategy = 'bec_id'
      for (const r of list) {
        if (r.bec_id == null || String(r.bec_id).trim() === '') ids.push(r.id)
      }
      continue
    }

    const keepMandate = list.filter(r => r.mandate_start === BEC_MANDATE)
    if (keepMandate.length >= 1) {
      strategy = strategy || 'mandate_start'
      for (const r of list) {
        if (r.mandate_start !== BEC_MANDATE) ids.push(r.id)
      }
      continue
    }

    console.warn(`[cleanup] Skip ambiguous duplicate name (${list.length} rows): "${name}"`)
  }

  return { ids: [...new Set(ids)], strategy: strategy || 'mandate_start' }
}

async function run() {
  const supabase = createServiceClient()
  const { rows, hasBecId } = await fetchAllRows(supabase, 'id, name, chamber, mandate_start, bec_id')
  console.log(`[cleanup] Loaded ${rows.length} deputat/senator rows (bec_id column: ${hasBecId ? 'yes' : 'no'})`)

  const { ids, strategy } = idsToDeleteForDuplicates(rows, hasBecId)
  console.log(`[cleanup] Strategy: ${strategy}; ${ids.length} row(s) to delete`)

  if (ids.length === 0) {
    console.log('[cleanup] Nothing to delete.')
  } else {
    const chunk = 100
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk)
      const { error } = await supabase.from('politicians').delete().in('id', slice)
      if (error) throw error
      console.log(`[cleanup] Deleted ${Math.min(i + chunk, ids.length)}/${ids.length}`)
    }
  }

  const { count, error: cErr } = await supabase
    .from('politicians')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .in('chamber', [...CHAMBERS])

  if (cErr) throw cErr
  console.log(`\n[cleanup] Active deputat/senator count: ${count ?? '?'}`)
}

if (process.argv[1]?.replace(/\\/g, '/').includes('cleanup-bec-duplicates')) {
  run().catch(e => {
    console.error('[cleanup] Fatal:', e)
    process.exit(1)
  })
}
