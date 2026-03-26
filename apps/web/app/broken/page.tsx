import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'

export const revalidate = 3600

export default async function BrokenPage() {
  const supabase = createClient()
  const { data: records } = await supabase
    .from('records')
    .select(`id, slug, type, text, status, date_made, impact_level, ai_confidence,
      politicians (id, slug, name, party_short, avatar_color, avatar_text_color)`)
    .eq('status', 'false')
    .order('date_made', { ascending: false })
    .limit(200)

  const breadcrumb = (
    <>
      TEVAD.RO <span className="text-[var(--text2)]">/</span>{' '}
      <span className="text-[var(--red)]">PROMISIUNI FALSE</span>
    </>
  )

  return (
    <AppShell
      breadcrumb={breadcrumb}
      topBarRight={
        <span className="font-mono text-[10px] text-[var(--red)]">
          {records?.length ?? 0} înregistrări
        </span>
      }
    >
      <div className="flex-1 overflow-y-auto">
        {(records ?? []).map((rec, i) => {
          const pol = rec.politicians as any
          return (
            <Link
              key={rec.id}
              href={`/politician/${pol?.slug}`}
              className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] border-l-2 border-l-[var(--red)] hover:bg-[rgba(240,69,69,0.03)] transition-colors animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 20) * 0.03}s` }}
            >
              <PoliticianAvatar
                name={pol?.name ?? '?'}
                avatarColor={pol?.avatar_color}
                avatarTextColor={pol?.avatar_text_color}
                size="sm"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-[var(--text3)]">{pol?.name}</span>
                  <span style={{ color: pol?.avatar_text_color ?? 'var(--accent2)', fontSize: '9px' }} className="font-mono">
                    {pol?.party_short}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text2)] leading-snug line-clamp-2">{rec.text}</p>
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
    </AppShell>
  )
}
