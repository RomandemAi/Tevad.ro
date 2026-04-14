import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getSiteUrl } from '@/lib/site-url'
import {
  RecordRowPoliticianAvatar,
  RecordRowPoliticianName,
} from '@/components/RecordRowPoliticianLead'
import StatusHintIcon from '@/components/StatusHintIcon'
import { getStatusHint } from '@/lib/record-status-hint'
import {
  GOV_PROGRAM_FILTER_PARAM,
  GOV_PROGRAM_FILTER_VALUE,
  isGovernmentProgramRecord,
} from '@/lib/is-government-program-record'

const STATUS_QUERY_PARAM = 'status' as const

type RecordStatusFilter = 'true' | 'false' | 'partial' | 'pending'

function parseStatusFilter(raw: string | undefined): RecordStatusFilter | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s === 'true' || s === 'false' || s === 'partial' || s === 'pending') return s
  return null
}

/** Preserves gov + status when building filter links. */
function promisesHref(opts: { gov?: boolean; status?: RecordStatusFilter | null }) {
  const q = new URLSearchParams()
  if (opts.gov) q.set(GOV_PROGRAM_FILTER_PARAM, GOV_PROGRAM_FILTER_VALUE)
  if (opts.status) q.set(STATUS_QUERY_PARAM, opts.status)
  const qs = q.toString()
  return qs ? `/promises?${qs}` : '/promises'
}

const STATUS_FILTER_OPTIONS: { status: RecordStatusFilter | null; label: string }[] = [
  { status: null, label: 'Toate' },
  { status: 'true', label: 'Adevărate' },
  { status: 'false', label: 'False' },
  { status: 'partial', label: 'Parțiale' },
  { status: 'pending', label: 'În verificare' },
]

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Toate promisiunile',
  description:
    'Lista promisiunilor politicienilor monitorizați în România — status de verificare, surse citate și nivel de impact.',
  alternates: { canonical: `${getSiteUrl()}/promises` },
}

const STATUS_LABEL: Record<string, string> = {
  true: 'ADEVĂRAT', false: 'FALS', partial: 'PARȚIAL', pending: 'PENDING',
}
const STATUS_CLASS: Record<string, string> = {
  true: 'bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.35)]',
  false: 'bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.35)]',
  partial: 'bg-[var(--amber-bg)] text-[var(--amber)] border-[rgba(217,119,6,0.35)]',
  pending: 'bg-[var(--slate-bg)] text-[var(--slate)] border-[var(--gray-200)]',
}

type Props = { searchParams?: { filter?: string; status?: string } }

export default async function PromisesPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: recordsRaw } = await supabase
    .from('records')
    .select(`id, slug, type, text, context, status, date_made, created_at, impact_level, ai_confidence, opinion_exempt, ai_reasoning,
      politicians (*)`)
    .order('created_at', { ascending: false })
    .limit(250)

  const filterGov = searchParams?.filter === GOV_PROGRAM_FILTER_VALUE
  const statusFilter = parseStatusFilter(searchParams?.status)

  let records = filterGov
    ? (recordsRaw ?? []).filter(r =>
        isGovernmentProgramRecord(r.slug as string, (r as { context?: string | null }).context)
      )
    : (recordsRaw ?? [])

  if (statusFilter) {
    records = records.filter(r => r.status === statusFilter)
  }

  const breadcrumb = (
    <>
      <span className="text-[var(--gray-500)]">TEVAD.ORG /</span> TOATE PROMISIUNILE
    </>
  )

  return (
    <AppShell
      breadcrumb={breadcrumb}
      topBarRight={
        <span className="font-mono text-[10px] text-[var(--gray-500)]">
          {records.length} înregistrări
          {filterGov ? ' (program de guvernare)' : ''}
          {statusFilter ? ` (status: ${STATUS_LABEL[statusFilter]})` : ''}
        </span>
      }
    >
      <div className="tev-page-fill flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto mb-4 flex max-w-[860px] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
              Verdict
            </span>
            {STATUS_FILTER_OPTIONS.map(({ status, label }) => {
              const active = statusFilter === status
              return (
                <Link
                  key={label}
                  href={promisesHref({ gov: filterGov, status })}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] transition-colors ${
                    active
                      ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                      : 'border-[var(--gray-200)] bg-white text-[var(--gray-700)] hover:border-[var(--gray-300)]'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
              Sursă
            </span>
            <Link
              href={promisesHref({ gov: false, status: statusFilter })}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] transition-colors ${
                !filterGov
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                  : 'border-[var(--gray-200)] bg-white text-[var(--gray-700)] hover:border-[var(--gray-300)]'
              }`}
            >
              Toate
            </Link>
            <Link
              href={promisesHref({ gov: true, status: statusFilter })}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] transition-colors ${
                filterGov
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                  : 'border-[var(--gray-200)] bg-white text-[var(--gray-700)] hover:border-[var(--gray-300)]'
              }`}
            >
              Program de guvernare
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-[860px] space-y-3">
        {records.map((rec, i) => {
          const pol = rec.politicians as any
          const fromGovProgram = isGovernmentProgramRecord(
            rec.slug as string,
            (rec as { context?: string | null }).context
          )
          const hint = getStatusHint({
            status: rec.status as 'true' | 'false' | 'partial' | 'pending',
            type: rec.type as 'promise' | 'statement' | 'vote',
            opinion_exempt: rec.opinion_exempt,
            ai_reasoning: rec.ai_reasoning,
          })
          return (
            <div
              key={rec.id}
              className="te-politician-card animate-fade-up flex items-stretch rounded-2xl border border-[var(--gray-200)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              style={{ animationDelay: `${Math.min(i, 20) * 0.03}s` }}
            >
              <Link
                href={`/politician/${pol?.slug}`}
                className="group flex min-w-0 flex-1 items-start gap-3 p-4"
              >
                <RecordRowPoliticianAvatar pol={pol} />
                <div className="min-w-0 flex-1">
                  <RecordRowPoliticianName pol={pol} />
                  <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-[var(--gray-600)]">{rec.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] ${STATUS_CLASS[rec.status]}`}>
                      {STATUS_LABEL[rec.status]}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--gray-500)]">
                      {new Date(rec.date_made).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                    {rec.impact_level === 'high' && (
                      <span className="rounded border border-[rgba(217,119,6,0.35)] bg-[var(--amber-bg)] px-1 py-0.5 font-mono text-[8px] text-[var(--amber)]">
                        IMPACT MAJOR
                      </span>
                    )}
                    {fromGovProgram && (
                      <span
                        className="rounded border border-[rgba(13,42,74,0.25)] bg-[rgba(13,42,74,0.06)] px-1 py-0.5 font-mono text-[8px] text-[var(--navy)]"
                        title="Angajament din programul de guvernare al coaliției (sursă: document oficial)"
                      >
                        PROGRAM GUVERNARE
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {hint.show && (
                <div className="flex shrink-0 items-center border-l border-[var(--gray-100)] px-2 py-4 md:px-3">
                  <StatusHintIcon summary={hint.summary} detail={hint.detail} compact />
                </div>
              )}
            </div>
          )
        })}
        {records.length === 0 && (
          <div className="flex items-center justify-center rounded-2xl border border-[var(--gray-200)] bg-white p-16 font-mono text-[12px] text-[var(--gray-500)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]">
            {(recordsRaw?.length ?? 0) > 0 && (statusFilter || filterGov)
              ? 'Nicio înregistrare pentru filtrele alese'
              : 'Nicio înregistrare'}
          </div>
        )}
        </div>
      </div>
    </AppShell>
  )
}
