import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 0 // always fresh — audit pages must not be cached

interface Props {
  params: { recordId: string }
}

export default async function AuditPage({ params }: Props) {
  const supabase = createClient()

  // Load record
  const { data: record } = await supabase
    .from('records')
    .select(`
      id, slug, type, text, status, date_made, ai_confidence, ai_reasoning, ai_model,
      ai_verified_at, politicians (id, slug, name, party_short, avatar_color, avatar_text_color)
    `)
    .eq('id', params.recordId)
    .single()

  if (!record) notFound()

  // Load all audit log entries for this record
  const { data: auditLogs } = await supabase
    .from('verdict_audit_logs')
    .select('*')
    .eq('record_id', params.recordId)
    .order('recorded_at', { ascending: false })

  const pol = record.politicians as any

  const STATUS_CLASS: Record<string, string> = {
    true: 'text-[var(--green)] border-[rgba(34,201,122,0.3)] bg-[rgba(34,201,122,0.08)]',
    false: 'text-[var(--red)] border-[rgba(240,69,69,0.3)] bg-[rgba(240,69,69,0.08)]',
    partial: 'text-[var(--amber)] border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.08)]',
    pending: 'text-[var(--text3)] border-[var(--border)] bg-[var(--surface)]',
  }

  return (
    <div className="min-h-screen max-w-[860px] mx-auto px-5 py-8">

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" stroke="#1d6ef5" strokeWidth="1.2"/>
          <path d="M14 7L21 11V19L14 23L7 19V11L14 7Z" fill="rgba(29,110,245,0.12)" stroke="#1d6ef5" strokeWidth="0.6"/>
          <circle cx="14" cy="15" r="2.5" fill="#0ea5e9"/>
        </svg>
        <span className="font-mono text-[13px] font-medium tracking-widest">
          VERI<span className="text-[var(--accent2)]">DEX</span>
        </span>
        <span className="font-mono text-[10px] text-[var(--text3)] ml-2">
          <Link href="/" className="hover:text-[var(--accent2)]">HOME</Link>
          {' / '}
          <Link href={`/politician/${pol?.slug}`} className="hover:text-[var(--accent2)]">
            {pol?.name?.toUpperCase()}
          </Link>
          {' / '}
          <span className="text-[var(--accent2)]">AUDIT</span>
        </span>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-[11px] font-medium flex-shrink-0 border border-white/[0.06]"
            style={{ background: pol?.avatar_color ?? '#0d2a4a', color: pol?.avatar_text_color ?? '#378ADD' }}
          >
            {pol?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] text-[var(--text3)]">{pol?.name}</span>
              <span style={{ color: pol?.avatar_text_color ?? 'var(--accent2)', fontSize: '9px' }} className="font-mono">
                {pol?.party_short}
              </span>
            </div>
            <p className="text-[13px] text-[var(--text)] leading-relaxed">"{record.text}"</p>
          </div>
          <span className={`font-mono text-[10px] px-2 py-1 rounded border flex-shrink-0 ${STATUS_CLASS[record.status]}`}>
            {record.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[9px] text-[var(--text3)] border-t border-[var(--border)] pt-3">
          <span>Record ID: <span className="text-[var(--text2)]">{record.id}</span></span>
          <span>Date made: <span className="text-[var(--text2)]">{record.date_made}</span></span>
          <span>Verified: <span className="text-[var(--text2)]">{record.ai_verified_at ? new Date(record.ai_verified_at).toLocaleDateString('ro-RO') : 'pending'}</span></span>
        </div>
      </div>

      {/* Audit log entries */}
      <div className="mb-4">
        <h2 className="font-mono text-[10px] text-[var(--text3)] uppercase tracking-[1.5px] mb-3">
          Audit Log — {auditLogs?.length ?? 0} verification(s)
        </h2>

        {(auditLogs ?? []).length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center font-mono text-[11px] text-[var(--text3)]">
            No audit entries yet — verification pending
          </div>
        ) : (
          (auditLogs ?? []).map((log, i) => (
            <div key={log.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-3">

              {/* Verdict header */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${STATUS_CLASS[log.verdict]}`}>
                  {log.verdict.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-[var(--text2)]">{log.confidence}% confidence</span>
                {log.blind_verified && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 border border-[rgba(29,110,245,0.3)] rounded bg-[rgba(29,110,245,0.08)] text-[var(--accent2)]">
                    BLIND VERIFIED
                  </span>
                )}
                {log.models_agreed === true && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 border border-[rgba(34,201,122,0.3)] rounded bg-[rgba(34,201,122,0.08)] text-[var(--green)]">
                    MODELS AGREED
                  </span>
                )}
                {log.models_agreed === false && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5 border border-[rgba(245,166,35,0.3)] rounded bg-[rgba(245,166,35,0.08)] text-[var(--amber)]">
                    MODELS DISAGREED → PENDING
                  </span>
                )}
                <span className="font-mono text-[9px] text-[var(--text3)] ml-auto">
                  {new Date(log.recorded_at).toLocaleString('ro-RO')}
                </span>
              </div>

              {/* Reasoning */}
              {log.reasoning && (
                <p className="text-[12px] text-[var(--text2)] leading-relaxed mb-3 pl-3 border-l-2 border-[var(--border2)]">
                  {log.reasoning}
                </p>
              )}

              {/* Model info */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[var(--surface2)] rounded-lg p-2.5 border border-[var(--border)]">
                  <p className="font-mono text-[8px] text-[var(--text3)] uppercase tracking-wider mb-1">Primary Model</p>
                  <p className="font-mono text-[10px] text-[var(--text2)]">{log.model_version}</p>
                  {log.verdict && (
                    <p className="font-mono text-[9px] text-[var(--text3)] mt-0.5">
                      verdict: <span className={`${STATUS_CLASS[log.verdict]?.split(' ')[0]}`}>{log.verdict}</span>
                      {' '}· {log.confidence}%
                    </p>
                  )}
                </div>
                {log.secondary_model_version && (
                  <div className="bg-[var(--surface2)] rounded-lg p-2.5 border border-[var(--border)]">
                    <p className="font-mono text-[8px] text-[var(--text3)] uppercase tracking-wider mb-1">Secondary Model</p>
                    <p className="font-mono text-[10px] text-[var(--text2)]">{log.secondary_model_version}</p>
                    {log.secondary_verdict && (
                      <p className="font-mono text-[9px] text-[var(--text3)] mt-0.5">
                        verdict: <span className={`${STATUS_CLASS[log.secondary_verdict]?.split(' ')[0]}`}>{log.secondary_verdict}</span>
                        {' '}· {log.secondary_confidence}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Sources fed */}
              {log.sources_fed && (
                <div className="border border-[var(--border)] rounded-lg p-3">
                  <p className="font-mono text-[8px] text-[var(--text3)] uppercase tracking-wider mb-2">
                    Sources fed to model ({Array.isArray(log.sources_fed) ? log.sources_fed.length : '?'})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(log.sources_fed) ? log.sources_fed : []).map((s: any, si: number) => (
                      <a
                        key={si}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-[var(--accent2)] opacity-80 hover:opacity-100 flex items-center gap-1"
                      >
                        <svg width="8" height="8" viewBox="0 0 11 11" fill="none">
                          <path d="M1 10L10 1M10 1H4M10 1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {s.outlet} [T{s.tier}]
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Diversity check */}
              {log.diversity_check_passed !== null && log.diversity_check_passed !== undefined && (
                <div className={`mt-2 font-mono text-[9px] px-2 py-1 rounded ${log.diversity_check_passed ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
                  Source diversity: {log.diversity_check_passed ? 'PASSED' : `FAILED — ${log.diversity_check_reason}`}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border)] font-mono text-[8px] text-[var(--text3)]">
                <span>System prompt: {log.system_prompt_version}</span>
                <span>Blind: {log.blind_verified ? 'yes' : 'no'}</span>
                <span>Log ID: {log.id.slice(0, 8)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="font-mono text-[9px] text-[var(--text3)] text-center pt-4 border-t border-[var(--border)]">
        <p>
          Audit log is public and permanent.
          System prompt:{' '}
          <a
            href="https://github.com/RomandemAi/Tevad.ro/blob/main/prompts/neutrality-system-prompt.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent2)] hover:opacity-80"
          >
            prompts/neutrality-system-prompt.md
          </a>
        </p>
      </div>
    </div>
  )
}
