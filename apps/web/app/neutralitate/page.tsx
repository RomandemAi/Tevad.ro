import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

const GH = 'https://github.com/RomandemAi/Tevad.ro' as const

export const metadata: Metadata = {
  title: 'Neutralitate — Tevad.org',
  description: 'Tevad.org nu are opinie politică — doar surse, audit și reguli publice.',
}

export default function NeutralitatePage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">NEUTRALITATE</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 md:px-6 md:py-12">
          <article className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:p-10 md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]">Neutralitate</h1>
            <p className="mt-4 font-sans text-xl font-semibold leading-snug text-[var(--gray-900)] md:text-2xl">
              Fără opinie politică. Doar surse, audit și reguli publice.
            </p>

            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              Tevad.org nu „ține cu” nimeni. Nu are rubrică editorială. Platforma descrie fapte verificabile (ce s-a spus,
              când, unde e publicat) și statusuri generate automat, cu audit.
            </p>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Reguli operaționale
              </h2>
              <ul className="mt-4 list-disc space-y-2.5 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <li>Același flux pentru toate partidele și funcțiile.</li>
                <li>Surse publice obligatorii (URL atribuibil).</li>
                <li>
                  Verdict <em>fals</em>: necesită dovezi robuste (minim două surse Tier‑1 independente sau sursă oficială +
                  Tier‑1).
                </li>
                <li>În lipsă de dovezi, statusul rămâne „în verificare”.</li>
              </ul>
              <p className="mt-4 font-mono text-[12px]">
                <a
                  href={`${GH}/blob/main/NEUTRALITY.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  NEUTRALITY.md →
                </a>
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">AI transparent</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Promptul de sistem și regulile sunt publice; orice schimbare majoră trebuie să fie vizibilă în istoricul
                GitHub.
              </p>
            </section>

            <p className="mt-10 font-mono text-[12px]">
              <Link href="/" className="text-[var(--blue)] hover:underline">
                ← Înapoi la platformă
              </Link>
            </p>
          </article>
        </div>
      </div>
    </AppShell>
  )
}

