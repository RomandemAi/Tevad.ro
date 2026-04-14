import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteUrl } from '@/lib/site-url'
import { credBadgeClass, displayScore, scoreColor, scoreLabel } from '@/lib/score-utils'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'
import ScoreBreakdown from '@/components/ScoreBreakdown'
import WealthDeclarationsPanel from '@/components/WealthDeclarationsPanel'
import RecordsSection from '@/components/RecordsSection'
import PartyLogo from '@/components/PartyLogo'
import { partyBadgeBackground } from '@/lib/party-logo'

export const revalidate = 3600

interface Props {
  params: { slug: string }
}

function ScoreRing({ score }: { score: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, Number(score))) / 100
  const dash = c * pct
  const col = scoreColor(Number(score))
  return (
    <div className="flex flex-shrink-0 flex-col items-center">
      <div className="relative h-16 w-16 md:h-20 md:w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--gray-200)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={col}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono text-[17px] font-medium tabular-nums md:text-[20px]"
            style={{ color: col }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
        Credibilitate
      </span>
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const base = getSiteUrl()
  const canonical = `${base}/politician/${params.slug}`
  const supabase = createClient()
  const { data: pol } = await supabase
    .from('politicians')
    .select('name, role, party')
    .eq('slug', params.slug)
    .single()
  if (!pol) {
    return {
      title: 'Politician',
      alternates: { canonical },
    }
  }
  const title = `${pol.name} · ${pol.role}`
  const description = `Urmărește promisiunile, declarațiile și voturile lui ${pol.name} (${pol.party}).`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} · Tevad.org`,
      description,
      url: canonical,
      type: 'profile',
      siteName: 'Tevad.org',
      locale: 'ro_RO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Tevad.org`,
      description,
    },
  }
}

export default async function PoliticianPage({ params }: Props) {
  const supabase = createClient()

  const { data: pol } = await supabase.from('politicians').select('*').eq('slug', params.slug).single()

  if (!pol) notFound()

  const { data: records } = await supabase
    .from('records')
    .select(`id, slug, type, text, status, date_made, impact_level, likes, dislikes, ai_confidence, opinion_exempt, ai_reasoning,
      sources (id, tier, outlet, url, archived_url, published_at)`)
    .eq('politician_id', pol.id)
    .order('date_made', { ascending: false })

  const { data: wealthRows } = await supabase
    .from('wealth_declarations')
    .select('id, year, type, pdf_url, archived_url, institution, declaration_date')
    .eq('politician_id', pol.id)
    .order('year', { ascending: false })

  const displayCredibility = displayScore(pol.score)
  const total = pol.total_records ?? 0
  const trueW = total > 0 ? ((pol.records_true ?? 0) / total) * 100 : 0
  const falseW = total > 0 ? ((pol.records_false ?? 0) / total) * 100 : 0
  const partW = total > 0 ? ((pol.records_partial ?? 0) / total) * 100 : 0

  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">{pol.name.toUpperCase()}</span>
    </>
  )

  const chips = [
    { n: pol.records_true ?? 0, label: 'Adevărate', bg: 'var(--green-bg)', fg: 'var(--green)' },
    { n: pol.records_false ?? 0, label: 'False', bg: 'var(--red-bg)', fg: 'var(--red)' },
    { n: pol.records_partial ?? 0, label: 'Parțiale', bg: 'var(--amber-bg)', fg: 'var(--amber)' },
    { n: pol.records_pending ?? 0, label: 'În verificare', bg: 'var(--slate-bg)', fg: 'var(--slate)' },
  ] as const

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-4 py-6 md:px-6 md:py-8">
          <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                <PoliticianAvatar
                  name={pol.name}
                  avatarColor={pol.avatar_color}
                  avatarTextColor={pol.avatar_text_color}
                  avatarUrl={pol.avatar_url}
                  size="xl"
                  shape="circle"
                  className="mx-auto sm:mx-0"
                />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <h1 className="font-sans text-[24px] font-bold leading-tight text-[var(--gray-900)] md:text-[28px]">
                      {pol.name}
                    </h1>
                    <span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide ${credBadgeClass(displayCredibility)}`}>
                      {scoreLabel(displayCredibility)}
                    </span>
                  </div>
                  <p className="mt-2 font-sans text-[14px] text-[var(--gray-500)] md:text-[15px]">
                    {pol.role}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span
                      className="rounded-full bg-[var(--gray-100)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-[var(--gray-600)]"
                    >
                      {pol.chamber}
                    </span>
                    <span
                      className="inline-flex rounded-full p-0.5"
                      style={{ backgroundColor: partyBadgeBackground(pol.party_short) }}
                      title={pol.party_short ?? undefined}
                    >
                      <PartyLogo partyShort={pol.party_short} size={26} className="border border-[var(--gray-200)] bg-white" />
                    </span>
                  </div>
                  {pol.constituency && (
                    <p className="mt-2 font-mono text-[11px] text-[var(--gray-500)]">{pol.constituency}</p>
                  )}

                  {total > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 flex h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[var(--gray-100)]">
                        <div style={{ width: `${trueW}%`, background: 'var(--green)' }} className="transition-all" />
                        <div style={{ width: `${falseW}%`, background: 'var(--red)' }} className="transition-all" />
                        <div style={{ width: `${partW}%`, background: 'var(--amber)' }} className="transition-all" />
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 font-mono text-[10px] sm:justify-start">
                        <span className="text-[var(--green)]">{pol.records_true ?? 0} adevărate</span>
                        <span className="text-[var(--red)]">{pol.records_false ?? 0} false</span>
                        <span className="text-[var(--amber)]">{pol.records_partial ?? 0} parțiale</span>
                        <span className="text-[var(--gray-500)]">{pol.records_pending ?? 0} în verificare</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <ScoreRing score={displayCredibility} />
            </div>

            <ScoreBreakdown
              promises={pol.score_promises ?? 50}
              reactions={pol.score_reactions ?? 50}
              sources={pol.score_sources ?? 50}
              consistency={pol.score_consistency ?? 50}
            />

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {chips.map(c => (
                <div
                  key={c.label}
                  className="rounded-xl border border-[var(--gray-200)] px-3 py-3 text-center"
                  style={{ backgroundColor: c.bg }}
                >
                  <div className="font-mono text-[22px] font-medium tabular-nums md:text-[24px]" style={{ color: c.fg }}>
                    {c.n}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--gray-500)]">
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            <WealthDeclarationsPanel
              politician={{
                id: pol.id,
                slug: pol.slug,
                last_declaration_date: (pol as { last_declaration_date?: string | null }).last_declaration_date ?? null,
                declaration_stopped_after_ccr:
                  (pol as { declaration_stopped_after_ccr?: boolean | null }).declaration_stopped_after_ccr ?? null,
              }}
              declarations={wealthRows ?? []}
            />
          </div>

          <div className="mt-8 md:mt-10">
            {(records ?? []).length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-[var(--gray-200)] bg-white py-16 font-mono text-[12px] text-[var(--gray-500)]">
                Nicio înregistrare disponibilă
              </div>
            ) : (
              <RecordsSection records={records as any} politicianId={pol.id} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
