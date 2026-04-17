import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import {
  GOVERNMENT_PROGRAM_ADOPTED_DATE,
  GOVERNMENT_PROGRAM_MANDATE,
  GOVERNMENT_PROGRAM_PDF_EN_BYTES,
  GOVERNMENT_PROGRAM_PDF_EN_URL,
  GOVERNMENT_PROGRAM_TITLE_RO,
} from '@tevad/scraper/government-program'

const GH_REPO = 'https://github.com/RomandemAi/Tevad.ro' as const

export const metadata: Metadata = {
  title: 'Despre proiect — Tevad.org',
  description:
    'Tevad.org: platformă deschisă de responsabilitate politică în România — promisiuni, surse, verificare AI.',
  openGraph: {
    title: 'Despre proiect — Tevad.org',
    description: 'Transparență, surse și neutralitate prin design.',
    images: [{ url: '/images/about-bg.jpg', width: 1200, height: 630 }],
  },
}

export default function AboutPage() {
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
            <h1
              id="despre"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]"
            >
              Despre
            </h1>
            <p className="mt-4 font-sans text-xl font-semibold leading-snug text-[var(--gray-900)] md:text-2xl">
              Tevad este o platformă deschisă (licență MIT) pentru responsabilitate politică în România: urmărește ce au
              spus și au promis aleșii, cu legături către surse publice și un scor de credibilitate calculat automat după
              formula publică <strong className="text-[var(--gray-900)]">v1.3.0 „Tank-Proof”</strong> (ponderi, prag de
              minimum zece înregistrări verificate, reacții și surse întărite împotriva manipulării).
            </p>
            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              Nu există rubrică de opinie: fiecare rând din baza de date descrie un fapt verificabil (ce s-a spus,
              când, unde e publicat, ce s-a întâmplat după, status). Codul aplicației, migrările de bază de date și
              documentele SCORING.md / NEUTRALITY.md din monorepo definesc comportamentul — modificările majore sunt
              menite să fie revizuite public, nu „la telefon”.
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              <li>
                <strong className="text-[var(--gray-900)]">Frontend:</strong> Next.js (App Router), TypeScript,
                Tailwind. <strong className="text-[var(--gray-900)]">Date:</strong> Supabase (PostgreSQL, politici RLS,
                realtime unde e activat).
              </li>
              <li>
                <strong className="text-[var(--gray-900)]">Pachete în monorepo:</strong> scrapere și integrări (ex.
                cdep.ro, senat.ro, gov.ro), monitor RSS, motor de verificare/scor în{' '}
                <code className="rounded bg-[var(--gray-100)] px-1 font-mono text-[12px]">packages/verifier</code>.
              </li>
              <li>
                <strong className="text-[var(--gray-900)]">Scop:</strong> același flux pentru toate partidele și
                funcțiile — fără clasament „preferat”, fără mesaje de campanie pe platformă.
              </li>
            </ul>
            <p className="mt-5 font-mono text-[12px] leading-relaxed text-[var(--gray-600)]">
              Depozit:{' '}
              <a
                href={GH_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--blue)] hover:underline"
              >
                {GH_REPO}
              </a>
            </p>

            <section id="program-guvernare" className="mt-10 scroll-mt-24 border-t border-[var(--gray-100)] pt-8">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Program de guvernare ({GOVERNMENT_PROGRAM_MANDATE})
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-500)]">
                Pentru promisiuni la nivel de coaliție folosim documentul oficial publicat pe{' '}
                <span className="text-[var(--gray-900)]">gov.ro</span>. PDF-ul în limba engleză a fost verificat
                (HTTP 200, ~{(GOVERNMENT_PROGRAM_PDF_EN_BYTES / 1024).toFixed(0)} KB, ultima modificare indicativă pe
                server: 30 iulie 2025). Textul român al programului coaliției (adoptare raportată{' '}
                {GOVERNMENT_PROGRAM_ADOPTED_DATE}) poartă titlul: «{GOVERNMENT_PROGRAM_TITLE_RO}» — îl tratăm ca sursă
                pentru înregistrări de tip promisiune, cu topic mapat la taxonomia Tevad.
              </p>
              <p className="mt-4 font-mono text-[12px] leading-relaxed">
                <a
                  href={GOVERNMENT_PROGRAM_PDF_EN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  {GOVERNMENT_PROGRAM_PDF_EN_URL}
                </a>
              </p>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-[var(--gray-500)]">
                Inserarea în baza de date a unor promisiuni rezumative se face cu scriptul{' '}
                <code className="rounded bg-[var(--gray-100)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--gray-800)]">
                  npm run seed-program -w @tevad/scraper
                </code>{' '}
                (Prim-ministru activ, idempotent).
              </p>
            </section>

            <section id="neutralitate" className="mt-10 scroll-mt-24 border-t border-[var(--gray-100)] pt-8">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Neutralitate</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Tevad nu are opinie politică și nu răspunde la „e o idee bună?” — doar la „este susținut factual de
                sursele citate?”. Charterul complet este în{' '}
                <a
                  href={`${GH_REPO}/blob/main/NEUTRALITY.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  NEUTRALITY.md
                </a>
                ; mai jos sunt principiile operaționale pe care se bazează interfața și datele.
              </p>
              <ul className="mt-4 list-disc space-y-2.5 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <li>
                  <strong className="text-[var(--gray-900)]">Fără comentariu editorial:</strong> înregistrarea conține
                  fapte și status (adevărat / fals / parțial / în verificare), fără adjective de poziționare politic.
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">Tratament egal:</strong> același tip de dovezi și aceeași
                  logică de scor pentru toți aleșii activi, indiferent de partid sau rol.
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">Verdict „fals”:</strong> nu se bazează pe o singură
                  sursă; se cer cel puțin două surse Tier-1 independente (care nu se copiază una pe alta) sau combinație
                  sursă oficială + Tier-1, conform regulilor din NEUTRALITY.md. În lipsă de dovezi, rămâne „în
                  verificare”.
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">Surse oficiale câștigă:</strong> la conflict între presă
                  și documente oficiale (ex. Monitorul Oficial, jurnal de vot cdep.ro / senat.ro), prioritatea este a
                  înregistrării oficiale.
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">Fără surse anonime:</strong> fiecare URL trebuie să fie
                  public, atribuibil și, unde e posibil, arhivat (ex. Wayback).
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">AI transparent:</strong> motorul rulează{' '}
                  <strong className="text-[var(--gray-900)]">Claude Sonnet + Haiku</strong> în paralel, cu{' '}
                  <strong className="text-[var(--gray-900)]">Grok (xAI)</strong> opțional când este activat în
                  infrastructură; payload-ul rămâne <strong className="text-[var(--gray-900)]">blind</strong> (fără
                  nume/partid în promptul de verdict), iar răspunsurile sunt validate ca{' '}
                  <strong className="text-[var(--gray-900)]">JSON strict</strong> cu{' '}
                  <strong className="text-[var(--gray-900)]">vot majoritar</strong>. Deciziile și sursele trimise pot fi
                  reconstituite din auditul înregistrării și din fișierele versionate (inclusiv{' '}
                  <code className="rounded bg-[var(--gray-100)] px-1 font-mono text-[12px]">
                    prompts/neutrality-system-prompt.md
                  </code>
                  ).
                </li>
                <li>
                  <strong className="text-[var(--gray-900)]">Scorul este matematică:</strong> ponderile și definițiile
                  componentelor sunt în{' '}
                  <a
                    href={`${GH_REPO}/blob/main/SCORING.md`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--blue)] hover:underline"
                  >
                    SCORING.md
                  </a>
                  ; fiecare recalculare poate fi înscrisă în istoricul scorului pentru politician.
                </li>
              </ul>
            </section>

            <section id="declaratii-ccr" className="mt-10 scroll-mt-24 border-t border-[var(--gray-100)] pt-8">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--amber)]">
                Declarații oprite (CCR)
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-500)]">
                După decizia CCR 297/2025 (efectivă 12 iulie 2025), unii aleși nu mai publică declarații de avere noi pe
                canalele monitorizate. Marcăm această stare distinct, cu link către arhivă când există.
              </p>
            </section>

            <p className="mt-10 font-mono text-[12px]">
              <Link href="/" className="text-[var(--blue)] hover:underline">
                ← Înapoi la clasament
              </Link>
            </p>
          </article>
        </div>
      </div>
    </AppShell>
  )
}
