import Link from 'next/link'

export interface WealthDeclarationRow {
  id: string
  year: number
  type: string
  pdf_url: string
  archived_url: string | null
  institution: string | null
  declaration_date: string | null
}

interface PoliticianWealthMeta {
  id: string
  slug: string
  last_declaration_date: string | null
  declaration_stopped_after_ccr: boolean | null
}

interface Props {
  politician: PoliticianWealthMeta
  declarations: WealthDeclarationRow[]
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (86400 * 1000)))
}

export default function WealthDeclarationsPanel({ politician, declarations }: Props) {
  const stopped = politician.declaration_stopped_after_ccr === true
  const voluntary = !stopped && politician.last_declaration_date
  const last = politician.last_declaration_date
  const days = daysSince(last)

  const borderClass = stopped
    ? 'border-[var(--amber)]'
    : voluntary
      ? 'border-[var(--green)]'
      : 'border-[var(--border)]'

  return (
    <div className={`mt-8 rounded-2xl border ${borderClass} bg-white p-5 shadow-sm`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text3)]">
          Declarații de avere
        </h2>
        {stopped && (
          <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--amber)] border border-[var(--amber)] px-1.5 py-0.5">
            Oprit
          </span>
        )}
        {!stopped && voluntary && (
          <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--green)] border border-[var(--green)] px-1.5 py-0.5">
            Publicat
          </span>
        )}
      </div>

      {stopped && (
        <div className="space-y-2 font-mono text-[11px] text-[var(--text2)] leading-relaxed">
          {last && (
            <p>
              Ultima declarație:{' '}
              <span className="text-[var(--text)]">
                {new Date(last).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
              </span>
            </p>
          )}
          {days != null && (
            <p className="text-[var(--text3)] text-[10px]">{days} zile fără declarație nouă (față de ultima publicată)</p>
          )}
          <p>Nu a publicat după decizia CCR 297/2025.</p>
          <p className="text-[var(--text3)] text-[10px]">
            Decizia CCR: 29 mai 2025 · Efectivă: 12 iulie 2025
          </p>
          <Link
            href={`/politician/${politician.slug}#declaratii-arhivate`}
            className="inline-block font-mono text-[10px] text-[var(--accent2)] hover:opacity-90"
          >
            Vezi declarațiile arhivate →
          </Link>
        </div>
      )}

      {!stopped && voluntary && (
        <p className="font-mono text-[11px] text-[var(--text2)]">
          Publică voluntar după decizia CCR.{' '}
          <Link href="#declaratii-arhivate" className="text-[var(--accent2)]">
            Vezi declarațiile →
          </Link>
        </p>
      )}

      {declarations.length > 0 && (
        <div id="declaratii-arhivate" className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-[var(--text3)]">Arhivă</p>
          <table className="w-full font-mono text-[10px] text-left text-[var(--text2)]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text3)]">
                <th className="py-1 pr-2">An</th>
                <th className="py-1 pr-2">Tip</th>
                <th className="py-1 pr-2">Instituție</th>
                <th className="py-1">Link</th>
              </tr>
            </thead>
            <tbody>
              {declarations.map(d => (
                <tr key={d.id} className="border-b border-[var(--border)]">
                  <td className="py-1.5 pr-2 tabular-nums">{d.year}</td>
                  <td className="py-1.5 pr-2 uppercase">{d.type}</td>
                  <td className="py-1.5 pr-2 max-w-[140px] truncate">{d.institution ?? '—'}</td>
                  <td className="py-1.5">
                    <a
                      href={d.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent2)] mr-2"
                    >
                      PDF ↗
                    </a>
                    {d.archived_url && (
                      <a
                        href={d.archived_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text3)]"
                      >
                        Arhivă ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
