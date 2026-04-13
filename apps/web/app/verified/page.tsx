import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'

export const revalidate = 3600

export default async function VerifiedPage() {
  const supabase = createClient()
  const { data: records } = await supabase
    .from('records')
    .select(`id, slug, type, text, status, date_made, impact_level, ai_confidence,
      politicians (*)`)
    .eq('status', 'true')
    .order('date_made', { ascending: false })
    .limit(200)

  const breadcrumb = (
    <>
      <span className="text-[var(--gray-500)]">TEVAD.RO /</span>{' '}
      <span className="text-[var(--green)]">VERIFICATE ADEVĂRATE</span>
    </>
  )

  return (
    <AppShell
      breadcrumb={breadcrumb}
      topBarRight={
        <span className="font-mono text-[10px] text-[var(--green)]">
          {records?.length ?? 0} înregistrări
        </span>
      }
    >
      <div className="tev-page-fill flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-[860px] space-y-3">
        {(records ?? []).map((rec, i) => {
          const pol = rec.politicians as any
          return (
            <Link
              key={rec.id}
              href={`/politician/${pol?.slug}`}
              className="te-politician-card flex animate-fade-up items-start gap-3 rounded-2xl border border-[var(--gray-200)] border-l-[3px] border-l-[var(--green)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{ animationDelay: `${Math.min(i, 20) * 0.03}s` }}
            >
              <PoliticianAvatar
                name={pol?.name ?? '?'}
                avatarColor={pol?.avatar_color}
                avatarTextColor={pol?.avatar_text_color}
                avatarUrl={pol?.avatar_url}
                size="sm"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--gray-500)]">{pol?.name}</span>
                  <span style={{ color: pol?.avatar_text_color ?? 'var(--cyan)', fontSize: '9px' }} className="font-mono">
                    {pol?.party_short}
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] leading-snug text-[var(--gray-600)]">{rec.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[rgba(22,163,74,0.35)] bg-[var(--green-bg)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--green)]">
                    ADEVĂRAT
                  </span>
                  <span className="font-mono text-[9px] text-[var(--gray-500)]">
                    {new Date(rec.date_made).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }).toUpperCase()}
                  </span>
                  {rec.ai_confidence && (
                    <span className="font-mono text-[8px] text-[var(--gray-500)]">AI {rec.ai_confidence}%</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
        {(records ?? []).length === 0 && (
          <div className="flex items-center justify-center rounded-2xl border border-[var(--gray-200)] bg-white p-16 font-mono text-[12px] text-[var(--gray-500)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
            Nicio înregistrare adevărată disponibilă
          </div>
        )}
        </div>
      </div>
    </AppShell>
  )
}
