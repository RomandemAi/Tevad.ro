'use client'

/** Mirrors `AiModelVotePublic` from `@tevad/verifier` (kept local to avoid client bundle coupling). */
interface AiVoteRow {
  label: string
  modelId: string
  verdict: 'true' | 'false' | 'partial' | 'pending'
  confidence: number
}

const VERDICT_RO: Record<string, string> = {
  true: 'adevărat',
  false: 'fals',
  partial: 'parțial',
  pending: 'în așteptare',
}

function parseVotes(raw: unknown): AiVoteRow[] {
  if (!Array.isArray(raw)) return []
  const out: AiVoteRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label : ''
    const modelId = typeof o.modelId === 'string' ? o.modelId : ''
    const verdict =
      o.verdict === 'true' || o.verdict === 'false' || o.verdict === 'partial' || o.verdict === 'pending'
        ? o.verdict
        : 'pending'
    const confidence = typeof o.confidence === 'number' && Number.isFinite(o.confidence) ? o.confidence : 0
    if (label && modelId) out.push({ label, modelId, verdict, confidence })
  }
  return out
}

export default function AiVerdictTransparency({
  plainSummary,
  aiExplain,
  modelVotes,
}: {
  plainSummary?: string | null
  aiExplain?: string | null
  modelVotes?: unknown
}) {
  const summary = plainSummary?.trim()
  const explain = aiExplain?.trim()
  const votes = parseVotes(modelVotes)

  if (!summary && !explain && votes.length === 0) return null

  return (
    <div className="mt-4 space-y-3">
      {summary ? (
        <div
          className="rounded-xl border-2 border-[rgba(22,163,74,0.45)] bg-[var(--green-bg)] px-4 py-3 shadow-[0_2px_12px_rgba(22,163,74,0.12)] md:px-5 md:py-4"
          role="region"
          aria-label="Rezumat verdict"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--green)]">Rezumat</p>
          <p className="mt-1.5 font-sans text-[15px] font-medium leading-snug text-[var(--gray-900)] md:text-[16px]">
            {summary}
          </p>
        </div>
      ) : null}

      {explain || votes.length > 0 ? (
        <details className="group rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] transition-colors open:bg-white open:shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-700)] marker:content-none md:px-5 md:py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex w-full items-center justify-between gap-2">
              <span>Cum a ajuns AI-ul la concluzie?</span>
              <span className="text-[var(--gray-400)] transition-transform duration-200 group-open:rotate-180">▼</span>
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--gray-200)] px-4 pb-4 pt-3 md:px-5 md:pb-5">
            {votes.length > 0 && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
                  Voturi ansamblu (3 modele)
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                  {votes.map(v => (
                    <li
                      key={v.modelId}
                      className="rounded-lg border border-[var(--gray-200)] bg-white px-3 py-2.5 text-center shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                    >
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-800)]">
                        {v.label}
                      </div>
                      <div className="mt-1 font-mono text-[12px] tabular-nums text-[var(--gray-600)]">{v.confidence}%</div>
                      <div className="mt-1 font-mono text-[10px] capitalize text-[var(--blue)]">
                        {VERDICT_RO[v.verdict] ?? v.verdict}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explain ? (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--gray-500)]">
                  Explicație detaliată
                </p>
                <p className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--gray-700)]">
                  {explain}
                </p>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  )
}
