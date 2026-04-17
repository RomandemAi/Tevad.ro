import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Despre Tevad.org',
  description: 'Te văd. — România, 2026',
}

export default function DesprePage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">DESPRE</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 md:px-6 md:py-12">
          <article className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:p-10 md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]">Despre Tevad.org</h1>
            <p className="mt-4 font-sans text-xl font-semibold leading-snug text-[var(--gray-900)] md:text-2xl">
              Te văd. — România, 2026
            </p>

            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              Tevad.org este o platformă civică open-source care monitorizează automat promisiunile, declarațiile și
              voturile politicienilor români.
            </p>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                De ce am construit asta
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                România are 467 de parlamentari, zeci de miniștri și mii de aleși locali. Fiecare face promisiuni. Puțini
                sunt ținuți la răspundere. Tevad.org schimbă asta.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Cum funcționează
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Sistemul monitorizează automat sursele de presă Tier-1 (Recorder.ro, HotNews.ro, G4Media.ro), extrage
                declarații atribuibile politicienilor și le verifică cu un ansamblu de modele AI independente (Claude
                Sonnet + Haiku; opțional al treilea model, Grok/xAI, când este activat în infrastructură) —{' '}
                <strong className="text-[var(--gray-900)]">blind</strong>, fără nume de politician în promptul de
                verdict, cu <strong className="text-[var(--gray-900)]">JSON strict</strong> și{' '}
                <strong className="text-[var(--gray-900)]">vot majoritar</strong> (2/3 sau acord 2/2). Fiecare verdict
                are jurnal de audit public. Scorul de credibilitate urmează formula{' '}
                <strong className="text-[var(--gray-900)]">v1.3.0 „Tank-Proof”</strong> din repository (ponderi,
                praguri, reacții ponderate, semnale de prospețime / link-uri moarte).
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Neutralitate</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Tevad.org nu are opinie politică. Nu suntem de stânga sau de dreapta. Nu suntem finanțați de niciun
                partid sau organizație. Verificăm toți politicienii cu același sistem. Promptul de sistem (v1.3.0) și
                formula de scor sunt publice în GitHub. Dacă nu ai încredere în noi — verifică codul sursă.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Cine suntem</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Un proiect civic independent, construit de cetățeni români care cred că promisiunile politice trebuie să
                fie verificabile public. Codul sursă:{" "}
                <a
                  href="https://github.com/RomandemAi/Tevad.ro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  github.com/RomandemAi/Tevad.ro
                </a>{" "}
                (MIT)
              </p>
            </section>

            <p className="mt-8 font-mono text-[12px] text-[var(--gray-700)]">„Promisiunile nu expiră.”</p>

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

