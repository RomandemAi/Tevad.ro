/**
 * packages/scraper/src/datagov.ts — data.gov.ro CKAN package_search (stub)
 */

const UA = 'Tevad.ro Data Pipeline (contact: open@tevad.ro)'
const CKAN = 'https://data.gov.ro/api/3/action/package_search'

export async function run(): Promise<{ packages: number }> {
  const q = encodeURIComponent('hotarari consilii locale')
  const url = `${CKAN}?q=${q}&rows=20`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`data.gov.ro ${res.status}`)
  const json = (await res.json()) as { result?: { count?: number; results?: { title?: string; name?: string }[] } }
  const results = json.result?.results ?? []
  console.log(`[datagov] Found ${json.result?.count ?? 0} packages (showing ${results.length})`)
  for (const r of results.slice(0, 5)) {
    console.log(`  — ${r.title ?? r.name}`)
  }
  return { packages: results.length }
}

if (process.argv[1]?.replace(/\\/g, '/').includes('datagov.ts')) {
  run().catch(e => {
    console.error('[datagov] Fatal:', e)
    process.exit(1)
  })
}
