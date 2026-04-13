import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Informații Legale — Tevad.org',
  description: 'Transparență totală — platforma care nu ascunde nimic.',
}

export default function LegalPage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">LEGAL</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 md:px-6 md:py-12">
          <article className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:p-10 md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]">
              Informații Legale
            </h1>
            <p className="mt-4 font-sans text-xl font-semibold leading-snug text-[var(--gray-900)] md:text-2xl">
              Transparență totală — platforma care nu ascunde nimic
            </p>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Natură juridică</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Tevad.org este un proiect civic independent, open-source, fără scop comercial. Nu percepem taxe
                utilizatorilor. Nu afișăm reclame. Nu colectăm date personale. Nu avem statut de publicație de presă și
                nu exercităm activitate editorială. Suntem o platformă tehnologică ce agregează și verifică automat
                informații publice despre aleșii României.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Date afișate</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Toate datele afișate provin exclusiv din surse publice:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <li>Declarații oficiale și stenograme parlamentare (cdep.ro, senat.ro)</li>
                <li>Surse de presă independente Tier-1 verificate (Recorder.ro, HotNews.ro, G4Media.ro)</li>
                <li>Documente oficiale publicate de instituțiile statului român</li>
                <li>Programul de guvernare publicat pe gov.ro</li>
              </ul>
              <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Tevad.org nu inventează, nu parafrazează și nu atribuie declarații fără surse citate explicit.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Verificare AI</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Verificarea declarațiilor se realizează automat prin două modele AI independente (Claude Sonnet + Claude
                Haiku, Anthropic) cu verificare anonimizată (blind verification — modelele nu cunosc identitatea
                politicianului în momentul verificării). Niciun verdict nu este emis de o persoană fizică. Promptul de
                sistem folosit este public și permanent:{' '}
                <code className="rounded bg-[var(--gray-100)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--gray-800)]">
                  prompts/neutrality-system-prompt.md
                </code>
                . Orice modificare a promptului necesită PR public + 14 zile de review comunitar.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Dreptul persoanelor vizate (GDPR)
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Datele politicienilor afișate reprezintă informații publice privind exercitarea mandatului sau funcției
                publice. Conform GDPR Art. 17(3)(d), dreptul de ștergere nu se aplică atunci când prelucrarea este
                necesară în scopuri de interes public. Conform Legii 161/2003 și principiului transparenței democratice,
                activitatea aleșilor în exercitarea funcției publice este publică. Tevad.org nu afișează date private
                (adrese personale, CNP, date familiale).
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Răspundere limitată
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Tevad.org acționează cu bună credință și diligență rezonabilă. Verdictele AI sunt orientative și pot
                conține erori datorate calității surselor disponibile. Nu ne asumăm răspunderea pentru decizii luate pe
                baza informațiilor afișate. Platforma funcționează în beta public — datele sunt în curs de completare și
                verificare continuă.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Drept de răspuns și corectare
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Orice persoană care consideră că o înregistrare conține date inexacte poate solicita revizuirea prin:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <li>
                  Email:{' '}
                  <a className="text-[var(--blue)] hover:underline" href="mailto:contact@tevad.org">
                    contact@tevad.org
                  </a>
                </li>
                <li>
                  GitHub Issue:{' '}
                  <a
                    className="text-[var(--blue)] hover:underline"
                    href="https://github.com/RomandemAi/Tevad.ro/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/RomandemAi/Tevad.ro/issues
                  </a>
                </li>
              </ul>
              <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Răspunsul va fi analizat în termen de 72 ore. Dacă eroarea este confirmată, înregistrarea va fi corectată
                sau eliminată. Dacă persoana vizată solicită drept de răspuns, acesta va fi afișat lângă înregistrarea
                contestată.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Cod sursă deschis</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Codul sursă complet al platformei este disponibil la:{' '}
                <a
                  className="text-[var(--blue)] hover:underline"
                  href="https://github.com/RomandemAi/Tevad.ro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/RomandemAi/Tevad.ro
                </a>
                . Licență: MIT — oricine poate verifica, folosi sau îmbunătăți platforma în condiții de transparență
                totală.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Contact</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <a className="text-[var(--blue)] hover:underline" href="mailto:contact@tevad.org">
                  contact@tevad.org
                </a>
                <br />
                Timp de răspuns: maximum 72 ore
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

