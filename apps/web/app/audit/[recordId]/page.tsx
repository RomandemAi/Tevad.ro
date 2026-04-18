import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PoliticianAvatar from '@/components/PoliticianAvatar'

export const revalidate = 0

interface Props {
  params: { recordId: string }
}

type VerdictKey = 'true' | 'false' | 'partial' | 'pending'

const VERDICT_EN: Record<VerdictKey, string> = {
  true: 'TRUE',
  false: 'FALSE',
  partial: 'PARTIAL',
  pending: 'PENDING',
}

const VERDICT_RO: Record<VerdictKey, string> = {
  true: 'Adevărat',
  false: 'Fals',
  partial: 'Parțial',
  pending: 'În așteptare',
}

const VERDICT_DARK: Record<
  VerdictKey,
  { ring: string; bg: string; text: string; glow: string }
> = {
  true: {
    ring: 'ring-emerald-500/40',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-200',
    glow: 'shadow-[0_0_40px_-8px_rgba(52,211,153,0.35)]',
  },
  false: {
    ring: 'ring-rose-500/40',
    bg: 'bg-rose-500/12',
    text: 'text-rose-200',
    glow: 'shadow-[0_0_40px_-8px_rgba(251,113,133,0.3)]',
  },
  partial: {
    ring: 'ring-amber-400/35',
    bg: 'bg-amber-500/12',
    text: 'text-amber-100',
    glow: 'shadow-[0_0_36px_-10px_rgba(251,191,36,0.25)]',
  },
  pending: {
    ring: 'ring-slate-500/30',
    bg: 'bg-slate-500/12',
    text: 'text-slate-200',
    glow: 'shadow-[0_0_32px_-10px_rgba(148,163,184,0.2)]',
  },
}

const VOTE_BADGE: Record<VerdictKey, string> = {
  true: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30',
  false: 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30',
  partial: 'bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/25',
  pending: 'bg-slate-600/40 text-slate-200 ring-1 ring-slate-500/30',
}

const TYPE_RO: Record<string, string> = {
  promise: 'Promisiune',
  statement: 'Declarație',
  vote: 'Vot',
}

function verdictKey(v: string | null | undefined): VerdictKey {
  const k = (v ?? 'pending').toLowerCase()
  return k === 'true' || k === 'false' || k === 'partial' || k === 'pending' ? k : 'pending'
}

type VoteRow = { label: string; modelId: string; verdict: VerdictKey; confidence: number }

function parseModelVotes(raw: unknown): VoteRow[] {
  if (!Array.isArray(raw)) return []
  const out: VoteRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label : ''
    const modelId = typeof o.modelId === 'string' ? o.modelId : ''
    const v = o.verdict
    const verdict: VerdictKey =
      v === 'true' || v === 'false' || v === 'partial' || v === 'pending' ? v : 'pending'
    const confidence = typeof o.confidence === 'number' && Number.isFinite(o.confidence) ? o.confidence : 0
    if (label && modelId) out.push({ label, modelId, verdict, confidence })
  }
  return out
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8c-1.5 2-4 2.5-4 5a4 4 0 108 0c0-2.5-2.5-3-4-5z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function AuditPage({ params }: Props) {
  const supabase = createClient()

  const byId = await supabase
    .from('records')
    .select(
      `
      id, slug, type, text, status, date_made, ai_confidence, ai_reasoning, ai_model,
      ai_verified_at, plain_summary, ai_explain, ai_model_votes, politicians (*)
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
          ai_verified_at, plain_summary, ai_explain, ai_model_votes, politicians (*)
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
    .order('recorded_at', { ascending: false })

  const { data: annotations } = await supabase
    .from('record_ai_annotations')
    .select('*')
    .eq('record_id', record.id)
    .order('created_at', { ascending: false })
    .limit(1)

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

  const rec = record as {
    plain_summary?: string | null
    ai_explain?: string | null
    ai_model_votes?: unknown
    type?: string
    ai_confidence?: number | null
  }
  const vk = verdictKey(record.status as string)
  const vd = VERDICT_DARK[vk]
  const votes = parseModelVotes(rec.ai_model_votes)
  const plainSummary = rec.plain_summary?.trim()
  const aiExplain = rec.ai_explain?.trim()
  const typeLabel = TYPE_RO[String(record.type)] ?? String(record.type)

  const rawPayloads = (auditLogs ?? []).map((log, idx) => ({
    idx: idx + 1,
    at: (log as { recorded_at?: string }).recorded_at,
    json: JSON.stringify(
      {
        audit_id: (log as { id?: string }).id,
        verdict: (log as { verdict?: unknown }).verdict,
        confidence: (log as { confidence?: unknown }).confidence,
        reasoning: (log as { reasoning?: unknown }).reasoning,
        model_version: (log as { model_version?: string }).model_version,
        model_primary: (log as { model_primary?: string }).model_primary,
        secondary_model_version: (log as { secondary_model_version?: string }).secondary_model_version,
        secondary_verdict: (log as { secondary_verdict?: unknown }).secondary_verdict,
        secondary_confidence: (log as { secondary_confidence?: unknown }).secondary_confidence,
        models_agreed: (log as { models_agreed?: unknown }).models_agreed,
        blind_verified: (log as { blind_verified?: unknown }).blind_verified,
        blind_payload: (log as { blind_payload?: unknown }).blind_payload,
        sources_fed: (log as { sources_fed?: unknown }).sources_fed,
        response_primary: (log as { response_primary?: unknown }).response_primary,
        response_secondary: (log as { response_secondary?: unknown }).response_secondary,
        prompt_version: (log as { prompt_version?: string }).prompt_version,
        system_prompt_version: (log as { system_prompt_version?: string }).system_prompt_version,
        diversity_check_passed: (log as { diversity_check_passed?: unknown }).diversity_check_passed,
        diversity_check_reason: (log as { diversity_check_reason?: unknown }).diversity_check_reason,
        flagged_for_review: (log as { flagged_for_review?: unknown }).flagged_for_review,
      },
      null,
      2
    ),
  }))

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

  const ann = (annotations ?? [])[0] as Record<string, unknown> | undefined

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="relative min-h-full overflow-hidden bg-[#070b12] pb-24 pt-2 md:pt-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(59,130,246,0.08),transparent_55%)]"
          aria-hidden
        />

        <div className="relative z-[1] mx-auto w-full max-w-[820px] px-5 md:max-w-[880px] md:px-10">
          {/* Politician strip */}
          <header className="mb-10 flex flex-col gap-6 border-b border-white/[0.06] pb-10 md:mb-14 md:flex-row md:items-center md:gap-8 md:pb-12">
            <PoliticianAvatar
              name={pol?.name ?? '?'}
              avatarColor={pol?.avatar_color}
              avatarTextColor={pol?.avatar_text_color}
              avatarUrl={pol?.avatar_url}
              partyShort={pol?.party_short}
              size="lg"
              className="mx-auto shrink-0 ring-2 ring-white/10 md:mx-0"
            />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Fișă publică</p>
              <h1 className="mt-2 font-sans text-[22px] font-semibold tracking-tight text-slate-100 md:text-[26px]">
                {pol?.name ?? 'Politician'}
              </h1>
              <p className="mt-1 text-[14px] text-slate-500">{pol?.party_short}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-slate-400 ring-1 ring-white/[0.08]">
                  {typeLabel}
                </span>
                {typeof rec.ai_confidence === 'number' && (
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-white/[0.08]">
                    Încredere AI {rec.ai_confidence}%
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Verdict hero */}
          <div className="mb-10 flex flex-col items-center gap-5 md:mb-12">
            <div
              className={`inline-flex flex-col items-center rounded-2xl px-8 py-5 ring-1 ${vd.ring} ${vd.bg} ${vd.glow} md:px-12 md:py-6`}
            >
              <span className={`font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500`}>Verdict</span>
              <span className={`mt-2 font-mono text-[34px] font-bold tracking-[0.08em] md:text-[42px] ${vd.text}`}>
                {VERDICT_EN[vk]}
              </span>
              <span className="mt-1 font-sans text-[15px] text-slate-400">{VERDICT_RO[vk]}</span>
            </div>
          </div>

          {/* Statement */}
          <section className="mb-12 md:mb-16">
            <div className="mb-4 flex items-center gap-2 text-slate-500">
              <IconDoc className="shrink-0 opacity-70" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Afirmație verificată</span>
            </div>
            <blockquote className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] backdrop-blur-sm md:px-10 md:py-10">
              <p className="text-center font-sans text-[18px] font-normal leading-[1.65] text-slate-100 md:text-left md:text-[21px] md:leading-[1.7]">
                &ldquo;{record.text}&rdquo;
              </p>
            </blockquote>
          </section>

          {/* plain_summary (feature 6) or legacy reasoning */}
          {plainSummary ? (
            <section className="mb-12 md:mb-14">
              <div className="mb-4 flex items-center gap-2 text-teal-400/90">
                <IconSparkles className="shrink-0" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Rezumat pentru cititori</span>
              </div>
              <div className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.12] to-cyan-500/[0.06] px-6 py-8 shadow-[0_24px_48px_-24px_rgba(20,184,166,0.25)] md:px-10 md:py-9">
                <p className="font-sans text-[17px] leading-relaxed text-teal-50/95 md:text-[18px]">{plainSummary}</p>
              </div>
            </section>
          ) : record.ai_reasoning ? (
            <section className="mb-12 md:mb-14">
              <div className="mb-4 flex items-center gap-2 text-slate-500">
                <IconSparkles className="shrink-0 opacity-60" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Motivație verdict (înainte de rezumat scurt)</span>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-8 md:px-10 md:py-9">
                <p className="font-sans text-[16px] leading-relaxed text-slate-300">{String(record.ai_reasoning)}</p>
              </div>
            </section>
          ) : null}

          {/* AI classification — humanized */}
          {ann && (
            <section className="mb-12 md:mb-14">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.45)] md:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-sans text-[16px] font-medium text-slate-200">Clasificare automată (orientativ)</h2>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 font-mono text-[9px] uppercase tracking-wide text-amber-200/90 ring-1 ring-amber-400/20">
                    poate greși
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a1018] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Tip de afirmație</p>
                    <p className="mt-2 font-sans text-[15px] text-slate-200">{String(ann.claim_kind ?? '—')}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a1018] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Cât de măsurabilă</p>
                    <p className="mt-2 font-sans text-[15px] text-slate-200">{String(ann.measurability ?? '—')}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a1018] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Tip sugerat</p>
                    <p className="mt-2 font-sans text-[15px] text-slate-200">{String(ann.suggested_type ?? '—')}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0a1018] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Încredere estimată</p>
                    <p className="mt-2 font-sans text-[15px] text-slate-200">{String(ann.confidence ?? '—')}%</p>
                  </div>
                  {ann.reasoning ? (
                    <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-[#0a1018] p-4">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Notă scurtă</p>
                      <p className="mt-2 font-sans text-[15px] leading-relaxed text-slate-300">{String(ann.reasoning)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {/* Transparency accordion */}
          {(votes.length > 0 || aiExplain) && (
            <section className="mb-12 md:mb-14">
              <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] open:bg-white/[0.05]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 md:px-8 md:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-sans text-[16px] font-medium text-slate-200">
                    Cum a ajuns AI-ul la concluzie?
                  </span>
                  <IconChevron className="shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="space-y-8 border-t border-white/[0.06] px-6 pb-8 pt-6 md:px-8 md:pb-10">
                  {votes.length > 0 && (
                    <div>
                      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Ansamblu — 3 modele
                      </p>
                      <ul className="grid gap-3 sm:grid-cols-3">
                        {votes.map(v => (
                          <li
                            key={v.modelId}
                            className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0a1018] px-4 py-4 text-center"
                          >
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                              {v.label}
                            </span>
                            <span
                              className={`mx-auto mt-3 inline-flex rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${VOTE_BADGE[v.verdict]}`}
                            >
                              {VERDICT_EN[v.verdict]}
                            </span>
                            <span className="mt-2 font-mono text-[12px] tabular-nums text-slate-500">{v.confidence}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiExplain ? (
                    <div>
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        Explicație detaliată
                      </p>
                      <p className="whitespace-pre-wrap font-sans text-[15px] leading-[1.75] text-slate-300">{aiExplain}</p>
                    </div>
                  ) : null}
                </div>
              </details>
            </section>
          )}

          {/* Meta row */}
          <section className="mb-12 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/[0.06] pt-10 font-mono text-[11px] text-slate-500 md:mb-14 md:pt-12">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-600">Verificat</span>
              <span className="mt-1 block text-slate-400">
                {record.ai_verified_at
                  ? new Date(String(record.ai_verified_at)).toLocaleString('ro-RO')
                  : 'în așteptare'}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-600">Dată afirmație</span>
              <span className="mt-1 block text-slate-400">{String(record.date_made)}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] uppercase tracking-wider text-slate-600">ID înregistrare</span>
              <span className="mt-1 block truncate text-slate-400">{String(record.id)}</span>
            </div>
          </section>

          {/* Audit journal — compact human view */}
          <section className="mb-10">
            <h2 className="mb-6 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Istoric verificări · {auditLogs?.length ?? 0}
            </h2>
            {(auditLogs ?? []).length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-14 text-center font-sans text-[15px] text-slate-500">
                Încă nu există intrări în jurnal — verificarea poate fi în curs.
              </div>
            ) : (
              <ul className="space-y-4">
                {(auditLogs ?? []).map(log => {
                  const l = log as {
                    id: string
                    verdict: string
                    confidence: number | null
                    reasoning: string | null
                    recorded_at: string
                    models_agreed: boolean | null
                    blind_verified?: boolean | null
                  }
                  const lk = verdictKey(l.verdict)
                  return (
                    <li
                      key={l.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-5 md:px-6 md:py-6"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${VOTE_BADGE[lk]}`}
                        >
                          {VERDICT_EN[lk]}
                        </span>
                        {typeof l.confidence === 'number' && (
                          <span className="font-mono text-[11px] text-slate-500">{l.confidence}% încredere</span>
                        )}
                        <time className="ml-auto font-mono text-[10px] text-slate-600">
                          {l.recorded_at ? new Date(l.recorded_at).toLocaleString('ro-RO') : ''}
                        </time>
                      </div>
                      {l.reasoning ? (
                        <p className="mt-4 border-l-2 border-sky-500/40 pl-4 font-sans text-[14px] leading-relaxed text-slate-400">
                          {l.reasoning}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-600">
                        {l.blind_verified ? (
                          <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-sky-300/90">Verificare oarbă</span>
                        ) : null}
                        {l.models_agreed === true ? (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300/90">Modele aliniate</span>
                        ) : null}
                        {l.models_agreed === false ? (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-200/90">Fără consens majoritar</span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Raw technical data — single accordion */}
          {rawPayloads.length > 0 && (
            <section className="mb-16">
              <details className="group rounded-2xl border border-white/[0.06] bg-[#050810] open:ring-1 open:ring-white/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Date tehnice complete (JSON)
                  </span>
                  <IconChevron className="shrink-0 text-slate-600 transition-transform group-open:rotate-180" />
                </summary>
                <div className="max-h-[70vh] space-y-6 overflow-y-auto border-t border-white/[0.06] px-4 py-5 md:px-5">
                  {rawPayloads.map(block => (
                    <div key={block.idx}>
                      <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                        Înregistrare #{block.idx}
                        {block.at ? ` · ${new Date(block.at).toLocaleString('ro-RO')}` : ''}
                      </p>
                      <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 p-4 font-mono text-[10px] leading-relaxed text-slate-400">
                        {block.json}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
            </section>
          )}

          <footer className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-8 text-center md:px-8">
            <p className="font-sans text-[13px] leading-relaxed text-slate-500">
              Jurnalul de audit este public și permanent. Prompt de sistem:{' '}
              <a
                href="https://github.com/RomandemAi/Tevad.ro/blob/main/prompts/neutrality-system-prompt.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline-offset-2 transition-colors hover:text-sky-300 hover:underline"
              >
                neutrality-system-prompt.md
              </a>
            </p>
          </footer>
        </div>
      </div>
    </AppShell>
  )
}
