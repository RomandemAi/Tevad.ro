import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { scoreColor, scoreLabel, credBadgeClass } from '@/lib/score-utils'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'
import ScoreRadar from '@/components/ScoreRadar'
import RecordsSection from '@/components/RecordsSection'

export const revalidate = 3600

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = createClient()
  const { data: pol } = await supabase
    .from('politicians')
    .select('name, role, party')
    .eq('slug', params.slug)
    .single()
  if (!pol) return { title: 'Politician — Tevad.ro' }
  return {
    title: `${pol.name} · ${pol.role} — Tevad.ro`,
    description: `Urmărește promisiunile, declarațiile și voturile lui ${pol.name} (${pol.party}).`,
  }
}

export default async function PoliticianPage({ params }: Props) {
  const supabase = createClient()

  const { data: pol } = await supabase
    .from('politicians')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!pol) notFound()

  const { data: records } = await supabase
    .from('records')
    .select(`id, type, text, status, date_made, impact_level, likes, dislikes, ai_confidence,
      sources (id, tier, outlet, url, archived_url, published_at)`)
    .eq('politician_id', pol.id)
    .order('date_made', { ascending: false })

  const total = pol.total_records ?? 0
  const trueW  = total > 0 ? ((pol.records_true    ?? 0) / total) * 100 : 0
  const falseW = total > 0 ? ((pol.records_false   ?? 0) / total) * 100 : 0
  const partW  = total > 0 ? ((pol.records_partial ?? 0) / total) * 100 : 0

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-[var(--accent2)] transition-colors">POLITICIENI</Link>
      <span className="text-[var(--text2)]"> / </span>
      <span className="text-[var(--text2)]">{pol.name.toUpperCase()}</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      {/* Politician header */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar with glow ring */}
          <div
            className="relative flex-shrink-0"
            style={{ filter: `drop-shadow(0 0 12px ${pol.avatar_text_color ?? '#378ADD'}40)` }}
          >
            <PoliticianAvatar
              name={pol.name}
              avatarColor={pol.avatar_color}
              avatarTextColor={pol.avatar_text_color}
              size="xl"
            />
          </div>

          {/* Name + details */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-medium text-[var(--text)]">{pol.name}</h1>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded border ${credBadgeClass(pol.score)}`}>
                {scoreLabel(pol.score)}
              </span>
            </div>
            <p className="font-mono text-[11px] text-[var(--text3)] mb-1">
              {pol.role}
              {' · '}
              <span style={{ color: pol.avatar_text_color ?? 'var(--accent2)' }}>{pol.party_short}</span>
              {' · '}
              <span className="capitalize">{pol.chamber}</span>
            </p>
            {pol.constituency && (
              <p className="font-mono text-[10px] text-[var(--text3)]">{pol.constituency}</p>
            )}

            {/* Record mix stacked bar */}
            {total > 0 && (
              <div className="mt-2.5">
                <div className="flex h-[3px] w-full rounded-full overflow-hidden gap-px mb-1.5">
                  <div style={{ width: `${trueW}%`,  background: 'var(--green)' }} className="transition-all" />
                  <div style={{ width: `${falseW}%`, background: 'var(--red)' }}   className="transition-all" />
                  <div style={{ width: `${partW}%`,  background: 'var(--amber)' }} className="transition-all" />
                </div>
                <div className="flex items-center gap-3 font-mono text-[9px]">
                  <span className="text-[var(--green)]">{pol.records_true ?? 0} adevărate</span>
                  <span className="text-[var(--red)]">{pol.records_false ?? 0} false</span>
                  <span className="text-[var(--amber)]">{pol.records_partial ?? 0} parțiale</span>
                  <span className="text-[var(--text3)]">{pol.records_pending ?? 0} în verificare</span>
                </div>
              </div>
            )}
          </div>

          {/* Big score */}
          <div
            className="text-right flex-shrink-0 rounded-xl p-3"
            style={{
              background: `radial-gradient(circle, ${scoreColor(pol.score)}12 0%, transparent 70%)`,
            }}
          >
            <div className="font-mono text-4xl font-light tabular-nums" style={{ color: scoreColor(pol.score) }}>
              {pol.score}
            </div>
            <div className="font-mono text-[8px] text-[var(--text3)] uppercase tracking-wider mt-0.5">
              Scor credibilitate
            </div>
          </div>
        </div>

        {/* Score radar */}
        <ScoreRadar
          promises={pol.score_promises ?? 50}
          reactions={pol.score_reactions ?? 50}
          sources={pol.score_sources ?? 50}
          consistency={pol.score_consistency ?? 50}
        />
      </div>

      {/* Records */}
      <div className="flex-1 overflow-y-auto p-5">
        {(records ?? []).length === 0 ? (
          <div className="flex items-center justify-center py-16 font-mono text-[11px] text-[var(--text3)]">
            NICIO ÎNREGISTRARE DISPONIBILĂ
          </div>
        ) : (
          <RecordsSection records={records as any} politicianId={pol.id} />
        )}
      </div>
    </AppShell>
  )
}
