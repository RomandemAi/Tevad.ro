import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'

export const revalidate = 0

interface Props {
  params: { recordId: string }
}

const cardShadow =
  'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]'
const cardShadowHover = 'md:transition-shadow md:duration-200 md:ease-out'

const STATUS_BADGE: Record<string, string> = {
  true: 'bg-[var(--green-bg)] text-[var(--green)] border-[rgba(22,163,74,0.35)]',
  false: 'bg-[var(--red-bg)] text-[var(--red)] border-[rgba(220,38,38,0.35)]',
  partial: 'bg-[var(--amber-bg)] text-[var(--amber)] border-[rgba(217,119,6,0.35)]',
  pending: 'bg-[var(--slate-bg)] text-[var(--slate)] border-[var(--gray-200)]',
}

const STATUS_TEXT: Record<string, string> = {
  true: 'text-[var(--green)]',
  false: 'text-[var(--red)]',
  partial: 'text-[var(--amber)]',
  pending: 'text-[var(--gray-500)]',
}

const innerBox = 'rounded-lg border border-[var(--gray-200)] bg-[var(--gray-100)] p-3'

function badgeKey(v: string | null | undefined) {
  const k = (v ?? 'pending').toLowerCase()
  return k in STATUS_BADGE ? k : 'pending'
}

export default async function AuditPage({ params }: Props) {
  const supabase = createClient()

  const byId = await supabase
    .from('records')
    .select(
      `
      id, slug, type, text, status, date_made, ai_confidence, ai_reasoning, ai_model,
      ai_verified_at, politicians (*)
    `
    )
    .eq('id', params.recordId)
    .maybeSingle()

  const bySlug = byId.data
    ? null
    : await supabase
        .from('records')
        .select(
          `
          id, slug, type, text, status, date_made, ai_confidence, ai_reasoning, ai_model,
          ai_verified_at, politicians (*)
        `
        )
        .eq('slug', params.recordId)
        .maybeSingle()

  const record = byId.data ?? bySlug?.data ?? null

  if (!record) notFound()

  const { data: auditLogs } = await supabase
    .from('verdict_audit_logs')
    .select('*')
    .eq('record_id', record.id)
    .order('created_at', { ascending: false })

  type JoinedPolitician = {
    id: string
    slug: string
    name: string
    party_short: string
    avatar_color: string | null
    avatar_text_color: string | null
    avatar_url?: string | null
  }
  const rawPol = record.politicians as JoinedPolitician | JoinedPolitician[] | null
  const pol: JoinedPolitician | null = Array.isArray(rawPol) ? rawPol[0] ?? null : rawPol

  const breadcrumb = (
    <>
      <Link
        href="/"
        className="text-[var(--gray-900)] transition-colors duration-200 ease-out hover:text-[var(--blue)]"
      >
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <Link
        href={`/politician/${pol?.slug ?? ''}`}
        className="text-[var(--gray-900)] transition-colors duration-200 ease-out hover:text-[var(--blue)]"
      >
        {(pol?.name ?? '?').toUpperCase()}
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="font-medium text-[var(--blue)]">AUDIT</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className={`tev-audit-wrap mx-auto w-full max-w-[860px] px-4 pb-10 pt-6 md:px-6`}>
        <div
          className={`mb-8 rounded-2xl border border-[var(--gray-200)] bg-white p-6 ${cardShadow} md:p-8`}
        >
          <div className="mb-5 flex items-start gap-4">
            <PoliticianAvatar
              name={pol?.name ?? '?'}
              avatarColor={pol?.avatar_color}
              avatarTextColor={pol?.avatar_text_color}
              avatarUrl={pol?.avatar_url}
              size="md"
              className="mt-0.5 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--gray-500)]">{pol?.name}</span>
                <span
                  className="font-mono text-[9px]"
                  style={{ color: pol?.avatar_text_color ?? 'var(--cyan)' }}
                >
                  {pol?.party_short}
                </span>
              </div>
              <p className="font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                &ldquo;{record.text}&rdquo;
              </p>
            </div>
            <span
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-wide ${STATUS_BADGE[badgeKey(record.status)]}`}
            >
              {record.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--gray-100)] pt-4 font-mono text-[10px] text-[var(--gray-500)]">
            <span>
              Record: <span className="text-[var(--gray-900)]">{record.id}</span>
            </span>
            <span>
              Dată: <span className="text-[var(--gray-900)]">{record.date_made}</span>
            </span>
            <span>
              Verificat:{' '}
              <span className="text-[var(--gray-900)]">
                {record.ai_verified_at
                  ? new Date(record.ai_verified_at).toLocaleDateString('ro-RO')
                  : 'în așteptare'}
              </span>
            </span>
          </div>
        </div>

        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
          Jurnal audit · {auditLogs?.length ?? 0} verificări
        </h2>

        {(auditLogs ?? []).length === 0 ? (
          <div
            className={`rounded-2xl border border-[var(--gray-200)] bg-white p-12 text-center font-mono text-[13px] text-[var(--gray-500)] ${cardShadow}`}
          >
            Nicio intrare în jurnal încă — verificare în curs
          </div>
        ) : (
          (auditLogs ?? []).map(log => (
            <div
              key={log.id}
              className={`mb-4 rounded-2xl border border-[var(--gray-200)] bg-white p-5 md:p-6 ${cardShadow} ${cardShadowHover} md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-wide ${STATUS_BADGE[badgeKey(log.verdict)]}`}
                >
                  {log.verdict}
                </span>
                <span className="font-mono text-[10px] text-[var(--gray-500)]">{log.confidence}% încredere</span>
                {log.blind_verified && (
                  <span className="rounded-full border border-[rgba(29,110,245,0.35)] bg-[var(--blue-light)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--blue)]">
                    Blind verificat
                  </span>
                )}
                {log.models_agreed === true && (
                  <span className="rounded-full border border-[rgba(22,163,74,0.35)] bg-[var(--green-bg)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--green)]">
                    Modele convenite
                  </span>
                )}
                {log.models_agreed === false && (
                  <span className="rounded-full border border-[rgba(217,119,6,0.35)] bg-[var(--amber-bg)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--amber)]">
                    Modele divergente → pending
                  </span>
                )}
                {log.flagged_for_review && (
                  <span className="rounded-full border border-[var(--gray-200)] bg-[var(--gray-100)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[var(--amber)]">
                    Flag revizuire
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-[var(--gray-500)]">
                  {new Date(log.recorded_at).toLocaleString('ro-RO')}
                </span>
              </div>

              {log.reasoning && (
                <p className="mb-4 border-l-[3px] border-[var(--blue)] pl-4 font-sans text-[14px] leading-relaxed text-[var(--gray-600)]">
                  {log.reasoning}
                </p>
              )}

              {(log.response_primary || log.response_secondary) && (
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {log.response_primary && (
                    <div className={innerBox}>
                      <p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                        primary_raw
                      </p>
                      <pre className="max-h-48 overflow-y-auto font-mono text-[10px] leading-snug text-[var(--gray-700)] whitespace-pre-wrap break-words">
                        {log.response_primary}
                      </pre>
                    </div>
                  )}
                  {log.response_secondary && (
                    <div className={innerBox}>
                      <p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                        secondary_raw
                      </p>
                      <pre className="max-h-48 overflow-y-auto font-mono text-[10px] leading-snug text-[var(--gray-700)] whitespace-pre-wrap break-words">
                        {log.response_secondary}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {log.blind_payload && (
                <div className={`mb-4 ${innerBox}`}>
                  <p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                    blind_payload
                  </p>
                  <pre className="max-h-40 overflow-y-auto font-mono text-[10px] leading-snug text-[var(--gray-700)] whitespace-pre-wrap break-words">
                    {typeof log.blind_payload === 'string'
                      ? log.blind_payload
                      : JSON.stringify(log.blind_payload, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={`${innerBox} bg-white`}>
                  <p className="mb-1.5 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                    Model principal
                  </p>
                  <p className="font-mono text-[11px] text-[var(--gray-900)]">{log.model_version}</p>
                  {log.verdict != null && (
                    <p className="mt-1 font-mono text-[10px] text-[var(--gray-500)]">
                      verdict:{' '}
                      <span className={STATUS_TEXT[badgeKey(log.verdict)]}>{log.verdict}</span> · {log.confidence}%
                    </p>
                  )}
                </div>
                {log.secondary_model_version && (
                  <div className={`${innerBox} bg-white`}>
                    <p className="mb-1.5 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                      Model secundar
                    </p>
                    <p className="font-mono text-[11px] text-[var(--gray-900)]">{log.secondary_model_version}</p>
                    {log.secondary_verdict != null && (
                      <p className="mt-1 font-mono text-[10px] text-[var(--gray-500)]">
                        verdict:{' '}
                        <span className={STATUS_TEXT[badgeKey(log.secondary_verdict)]}>{log.secondary_verdict}</span> ·{' '}
                        {log.secondary_confidence}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {log.sources_fed && (
                <div className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-4">
                  <p className="mb-2 font-mono text-[8px] uppercase tracking-wider text-[var(--gray-500)]">
                    Surse transmise ({Array.isArray(log.sources_fed) ? log.sources_fed.length : '?'})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(log.sources_fed) ? log.sources_fed : []).map((s: { url: string; outlet: string; tier: string }, si: number) => (
                      <a
                        key={si}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md font-mono text-[10px] text-[var(--blue)] transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
                      >
                        <svg width="9" height="9" viewBox="0 0 11 11" fill="none" aria-hidden>
                          <path
                            d="M1 10L10 1M10 1H4M10 1V7"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {s.outlet} [T{s.tier}]
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {log.diversity_check_passed !== null && log.diversity_check_passed !== undefined && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 font-mono text-[10px] ${
                    log.diversity_check_passed
                      ? 'bg-[var(--green-bg)] text-[var(--green)]'
                      : 'bg-[var(--amber-bg)] text-[var(--amber)]'
                  }`}
                >
                  Diversitate surse: {log.diversity_check_passed ? 'OK' : `Nu — ${log.diversity_check_reason ?? ''}`}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--gray-100)] pt-3 font-mono text-[9px] text-[var(--gray-500)]">
                <span>prompt: {log.prompt_version ?? log.system_prompt_version}</span>
                <span>Blind: {log.blind_verified ? 'da' : 'nu'}</span>
                <span>ID: {log.id.slice(0, 8)}…</span>
              </div>
            </div>
          ))
        )}

        <footer className="mt-8 rounded-2xl border border-[var(--gray-200)] bg-white px-5 py-4 text-center font-mono text-[10px] leading-relaxed text-[var(--gray-500)] shadow-sm">
          <p>
            Jurnalul de audit este public și permanent. Prompt de sistem:{' '}
            <a
              href="https://github.com/RomandemAi/Tevad.ro/blob/main/prompts/neutrality-system-prompt.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--blue)] underline-offset-2 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2"
            >
              prompts/neutrality-system-prompt.md
            </a>
          </p>
        </footer>
      </div>
    </AppShell>
  )
}
