import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { scoreColor, scoreLabel, credBadgeClass } from '@/lib/score-utils'

export const revalidate = 3600 // revalidate every hour

export default async function HomePage() {
  const supabase = createClient()

  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, slug, name, role, party, party_short, chamber, score, score_promises, score_reactions, score_sources, score_consistency, total_records, records_true, records_false, records_pending, avatar_color, avatar_text_color')
    .eq('is_active', true)
    .order('score', { ascending: false })

  if (error) console.error('Failed to load politicians:', error)

  const total = politicians?.length ?? 0
  const broken = politicians?.reduce((a, p) => a + (p.records_false ?? 0), 0) ?? 0
  const avgScore = total > 0
    ? Math.round((politicians?.reduce((a, p) => a + p.score, 0) ?? 0) / total)
    : 0

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
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse"/>
            <span className="font-mono text-[10px] text-[var(--text3)] tracking-wide">SISTEM ACTIV · RO-v2.0</span>
          </div>
        </div>

        <nav className="p-2 flex-1">
          <p className="font-mono text-[9px] text-[var(--text3)] tracking-[1.5px] uppercase px-2 py-2">Index</p>
          <Link href="/" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--accent2)] bg-[rgba(29,110,245,0.12)] border border-[rgba(29,110,245,0.25)] mb-0.5">
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
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] ml-auto pulse"/>
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

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <span className="font-mono text-[11px] text-[var(--text3)]">
            TEVAD.RO <span className="text-[var(--text2)]">/</span> POLITICIENI <span className="text-[var(--text2)]">/</span> ROMÂNIA
          </span>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-[var(--border)]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-center">
            <div className="font-mono text-2xl font-light text-[var(--text)]">{total}</div>
            <div className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider mt-1">Politicieni</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-center">
            <div className="font-mono text-2xl font-light text-[var(--red)]">{broken}</div>
            <div className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider mt-1">Promisiuni false</div>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-center">
            <div className={`font-mono text-2xl font-light`} style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
            <div className="font-mono text-[9px] text-[var(--text3)] uppercase tracking-wider mt-1">Scor mediu</div>
          </div>
        </div>

        {/* Politician list */}
        <div className="flex-1 overflow-y-auto">
          {(politicians ?? []).map((pol, i) => (
            <Link
              key={pol.id}
              href={`/politician/${pol.slug}`}
              className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group relative animate-fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Active left indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-[var(--border2)] transition-colors"/>

              {/* Rank */}
              <span className="font-mono text-[10px] text-[var(--text3)] w-5 text-right flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0 border border-white/[0.06]"
                style={{ background: pol.avatar_color ?? '#0d2a4a', color: pol.avatar_text_color ?? '#378ADD' }}
              >
                {pol.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text)] mb-0.5">{pol.name}</div>
                <div className="font-mono text-[11px] text-[var(--text3)] truncate">
                  {pol.role} · <span style={{ color: pol.avatar_text_color ?? 'var(--accent2)', fontSize: '9px' }}>{pol.party_short}</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-mono text-base font-medium" style={{ color: scoreColor(pol.score) }}>
                  {pol.score}
                </span>
                <div className="w-12 h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pol.score}%`, background: scoreColor(pol.score) }}
                  />
                </div>
              </div>
            </Link>
          ))}

          {total === 0 && (
            <div className="flex items-center justify-center p-16 font-mono text-[11px] text-[var(--text3)]">
              LOADING RECORDS...
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
