import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import StatsRow from '@/components/StatsRow'
import PoliticianList from '@/components/PoliticianList'

export const revalidate = 3600

export default async function HomePage() {
  const supabase = createClient()

  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, slug, name, role, party, party_short, chamber, score, score_promises, score_reactions, score_sources, score_consistency, total_records, records_true, records_false, records_partial, records_pending, avatar_color, avatar_text_color')
    .eq('is_active', true)
    .order('score', { ascending: false })

  if (error) console.error('Failed to load politicians:', error)

  const list    = politicians ?? []
  const total   = list.length
  const broken  = list.reduce((a, p) => a + (p.records_false   ?? 0), 0)
  const pending = list.reduce((a, p) => a + (p.records_pending ?? 0), 0)
  const avgScore = total > 0
    ? Math.round(list.reduce((a, p) => a + p.score, 0) / total)
    : 0

  const breadcrumb = (
    <>
      TEVAD.RO <span className="text-[var(--text2)]">/</span> POLITICIENI{' '}
      <span className="text-[var(--text2)]">/</span> ROMÂNIA
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <StatsRow total={total} broken={broken} pending={pending} avgScore={avgScore} />
      <PoliticianList politicians={list} />
    </AppShell>
  )
}
