import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 3600

export default async function BrokenPage() {
  const supabase = createClient()

  const { data: records } = await supabase
    .from('records')
    .select(`
      id, slug, type, text, status, date_made, impact_level, ai_confidence,
      politicians (id, slug, name, party_short, avatar_color, avatar_text_color)
    `)
    .eq('status', 'false')
    .order('date_made', { ascending: false })
    .limit(200)

  return (
    <div className="flex min-h-screen max-w-[1020px] mx-auto">

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
          <Link href="/broken" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--accent2)] bg-[rgba(240,69,69,0.08)] border border-[rgba(240,69,69,0.25)] mb-0.5">
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

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
          <span className="font-mono text-[11px] text-[var(--text3)]">
            TEVAD.RO <span className="text-[var(--text2)]">/</span> <span className="text-[var(--red)]">PROMISIUNI FALSE</span>
          </span>
          <span className="font-mono text-[10px] text-[var(--red)] ml-auto">
            {records?.length ?? 0} înregistrări
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(records ?? []).map((rec, i) => {
            const pol = rec.politicians as any
            return (
              <Link
                key={rec.id}
                href={`/politician/${pol?.slug}`}
                className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] border-l-2 border-l-[var(--red)] hover:bg-[rgba(240,69,69,0.03)] transition-colors group animate-fade-up"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-medium flex-shrink-0 border border-white/[0.06] mt-0.5"
                  style={{ background: pol?.avatar_color ?? '#0d2a4a', color: pol?.avatar_text_color ?? '#378ADD' }}
                >
                  {pol?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-[var(--text3)]">{pol?.name}</span>
                    <span style={{ color: pol?.avatar_text_color ?? 'var(--accent2)', fontSize: '9px' }} className="font-mono">
                      {pol?.party_short}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text2)] leading-snug">{rec.text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm border bg-[rgba(240,69,69,0.1)] text-[var(--red)] border-[rgba(240,69,69,0.3)]">
                      FALS
                    </span>
                    <span className="font-mono text-[9px] text-[var(--text3)]">
                      {new Date(rec.date_made).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                    {rec.ai_confidence && (
                      <span className="font-mono text-[8px] text-[var(--text3)]">AI {rec.ai_confidence}%</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}

          {(records ?? []).length === 0 && (
            <div className="flex items-center justify-center p-16 font-mono text-[11px] text-[var(--text3)]">
              NICIO PROMISIUNE FALSĂ ÎNREGISTRATĂ
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
