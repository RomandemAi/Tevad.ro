import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { scoreColor, scoreLabel, credBadgeClass } from '@/lib/score-utils'
import RecordCard from '@/components/RecordCard'

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
    description: `Urmărește promisiunile, declarațiile și voturile lui ${pol.name} (${pol.party}). Verificate cu AI, sursă citată.`,
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
    .select(`
      id, type, text, status, date_made, impact_level, likes, dislikes, ai_confidence,
      sources (id, tier, outlet, url, archived_url, published_at)
    `)
    .eq('politician_id', pol.id)
    .order('date_made', { ascending: false })

  const scoreComponents = [
    { label: 'Promisiuni', value: pol.score_promises, weight: '35%' },
    { label: 'Reacții', value: pol.score_reactions, weight: '20%' },
    { label: 'Surse', value: pol.score_sources, weight: '25%' },
    { label: 'Consistență', value: pol.score_consistency, weight: '20%' },
  ]

  return (
    <div className="flex min-h-screen max-w-[1020px] mx-auto">

      {/* Sidebar */}
      <aside className="w-[210px] flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" stroke="#1d6ef5" strokeWidth="1.2"/>
              <path d="M14 7L21 11V19L14 23L7 19V11L14 7Z" fill="rgba(29,110,245,0.12)" stroke="#1d6ef5" strokeWidth="0.6"/>
              <circle cx="14" cy="15" r="2.5" fill="#0ea5e9"/>
            </svg>
            <span className="font-mono text-[15px] font-medium tracking-widest">
              VERI<span className="text-[var(--accent2)]">DEX</span>
            </span>
          </div>
        </div>

        <nav className="p-2 flex-1">
          <p className="font-mono text-[9px] text-[var(--text3)] tracking-[1.5px] uppercase px-2 py-2">Index</p>
          <Link href="/" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--text2)] hover:bg-[var(--surface2)] mb-0.5">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
            Politicieni
          </Link>
          <Link href="/promises" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--text2)] hover:bg-[var(--surface2)] mb-0.5">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
            Toate promisiunile
          </Link>
          <p className="font-mono text-[9px] text-[var(--text3)] tracking-[1.5px] uppercase px-2 py-2 mt-2">Filtre</p>
          <Link href="/broken" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--text2)] hover:bg-[var(--surface2)] mb-0.5">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            Promisiuni false
          </Link>
          <Link href="/verified" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--text2)] hover:bg-[var(--surface2)] mb-0.5">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            Verificate adevărate
          </Link>
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <p className="font-mono text-[9px] text-[var(--text3)] tracking-wide">TEVAD.RO · RO · OPEN SOURCE</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <span className="font-mono text-[11px] text-[var(--text3)]">
            <Link href="/" className="hover:text-[var(--accent2)] transition-colors">POLITICIENI</Link>
            <span className="text-[var(--text2)]"> / </span>
            <span className="text-[var(--text2)]">{pol.name.toUpperCase()}</span>
          </span>
        </div>

        {/* Politician header */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center font-mono text-[14px] font-medium flex-shrink-0 border border-white/[0.06]"
              style={{ background: pol.avatar_color ?? '#0d2a4a', color: pol.avatar_text_color ?? '#378ADD' }}
            >
              {pol.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-medium text-[var(--text)]">{pol.name}</h1>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${credBadgeClass(pol.score)}`}>
                  {scoreLabel(pol.score)}
                </span>
              </div>
              <p className="font-mono text-[12px] text-[var(--text3)]">
                {pol.role} · <span style={{ color: pol.avatar_text_color ?? 'var(--accent2)' }}>{pol.party_short}</span> · {pol.party}
              </p>
              {pol.constituency && (
                <p className="font-mono text-[11px] text-[var(--text3)] mt-0.5">{pol.constituency}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-3xl font-light" style={{ color: scoreColor(pol.score) }}>
                {pol.score}
              </div>
              <div className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider">Scor credibilitate</div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {scoreComponents.map(c => (
              <div key={c.label} className="bg-[var(--surface2)] rounded-lg p-2.5 border border-[var(--border)]">
                <div className="font-mono text-base font-light" style={{ color: scoreColor(c.value) }}>
                  {c.value}
                </div>
                <div className="font-mono text-[8px] text-[var(--text3)] uppercase tracking-wider mt-0.5">
                  {c.label}
                </div>
                <div className="font-mono text-[8px] text-[var(--text3)]">{c.weight}</div>
                <div className="w-full h-[2px] bg-[var(--border)] rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.value}%`, background: scoreColor(c.value) }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Record counts */}
          <div className="flex items-center gap-4 mt-3 font-mono text-[10px]">
            <span className="text-[var(--text3)]">{pol.total_records ?? 0} înregistrări</span>
            <span className="text-[var(--green)]">{pol.records_true ?? 0} adevărate</span>
            <span className="text-[var(--red)]">{pol.records_false ?? 0} false</span>
            <span className="text-[var(--amber)]">{pol.records_partial ?? 0} parțiale</span>
            <span className="text-[var(--text3)]">{pol.records_pending ?? 0} în verificare</span>
          </div>
        </div>

        {/* Records */}
        <div className="flex-1 overflow-y-auto p-5">
          {(records ?? []).length === 0 ? (
            <div className="flex items-center justify-center p-16 font-mono text-[11px] text-[var(--text3)]">
              NICIO ÎNREGISTRARE DISPONIBILĂ
            </div>
          ) : (
            (records ?? []).map(record => (
              <RecordCard key={record.id} record={record as any} politicianId={pol.id} />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
