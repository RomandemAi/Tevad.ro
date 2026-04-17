import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

const GH = 'https://github.com/RomandemAi/Tevad.ro' as const

export const metadata: Metadata = {
  title: 'Cum funcționează — Tevad.org',
  description: 'Cum monitorizează și verifică automat Tevad.org informații publice despre aleșii României.',
}

export default function CumFunctioneazaPage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">CUM FUNCȚIONEAZĂ</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 md:px-6 md:py-12">
          <article className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:p-10 md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]">
              Cum funcționează
            </h1>
            <p className="mt-4 font-sans text-xl font-semibold leading-snug text-[var(--gray-900)] md:text-2xl">
              Un registru public: promisiuni, declarații și voturi — cu surse și audit.
            </p>

            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              Tevad.org este o platformă tehnologică: agregă automat informații publice și le verifică printr-un flux
              standardizat, identic pentru toți politicienii.
            </p>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Scor (0–100) — v1.3.0 „Tank-Proof”
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Scorul combină cinci componente cu ponderi fixe și publice:{' '}
                <strong className="text-[var(--gray-900)]">promisiuni (25%)</strong>,{' '}
                <strong className="text-[var(--gray-900)]">declarații materiale (12%)</strong>,{' '}
                <strong className="text-[var(--gray-900)]">reacții (15%)</strong> — ponderate după încrederea
                amprentei și plafon zilnic anti-spike —,{' '}
                <strong className="text-[var(--gray-900)]">surse (28%)</strong> — inclusiv prospețime și bonus pentru
                mai multe surse independente — și <strong className="text-[var(--gray-900)]">consistență (20%)</strong>{' '}
                (contradicții în același mandat penalizate mai sever). Până la minimum{' '}
                <strong className="text-[var(--gray-900)]">10 înregistrări verificate</strong>, scorul principal rămâne
                ancorat la linia neutră <strong className="text-[var(--gray-900)]">50</strong>, ca să nu pară „precis”
                pe eșantion mic.
              </p>
              <p className="mt-4 font-mono text-[12px]">
                <a
                  href={`${GH}/blob/main/SCORING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  SCORING.md →
                </a>
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Verificare (blind) — v1.3.0 „Missile-Proof”
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Verdictul este generat automat, <strong className="text-[var(--gray-900)]">blind</strong>: în prompt nu
                intră numele politicianului sau partidul — doar textul, data, tipul înregistrării și extrase din surse.
                Rulăm în paralel <strong className="text-[var(--gray-900)]">Claude Sonnet</strong>,{' '}
                <strong className="text-[var(--gray-900)]">Claude Haiku</strong> și{' '}
                <strong className="text-[var(--gray-900)]">Grok (xAI)</strong>. Fiecare răspuns
                trebuie să fie <strong className="text-[var(--gray-900)]">JSON valid</strong> pe schema fixă; la neacord
                sau ieșire suspectă, verdictul merge în <strong className="text-[var(--gray-900)]">în verificare</strong>{' '}
                (pending). Fiecare verdict are pagină de audit.
              </p>
              <p className="mt-4 font-mono text-[12px]">
                <a
                  href={`${GH}/blob/main/prompts/neutrality-system-prompt.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  prompts/neutrality-system-prompt.md →
                </a>
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Operațiuni automate (cron)
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Pe lângă monitorizarea RSS și coada de verificare, rulăm periodic verificări de{' '}
                <strong className="text-[var(--gray-900)]">sănătate URL</strong> (status HTTP, timestamp) pentru sursele
                citate și un pas de <strong className="text-[var(--gray-900)]">re-verificare</strong> pentru înregistrări
                vechi cu prea puține surse — ca să ținem legătura cu realitatea publică, nu doar cu textul salvat o
                dată.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Surse</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Sursele trebuie să fie URL-uri publice și atribuibile. Pentru un verdict <em>fals</em> sunt necesare
                dovezi robuste (cel puțin două surse Tier-1 independente sau sursă oficială + Tier-1). În lipsă, statusul
                rămâne „în verificare”.
              </p>
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

