import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Politica de Confidențialitate — Tevad.org',
  description: 'Tevad.org nu colectează date personale ale vizitatorilor.',
}

export default function PrivacyPage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">PRIVACY</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 md:px-6 md:py-12">
          <article className="rounded-2xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out md:p-10 md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-500)]">
              Politica de Confidențialitate
            </h1>

            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
              Tevad.org nu colectează, nu stochează și nu procesează date personale ale vizitatorilor platformei.
            </p>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Cookies și tracking
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Nu folosim cookies de tracking sau analytics. Nu integrăm Google Analytics, Facebook Pixel sau instrumente
                similare de urmărire. Singurul mecanism de stocare local este un fingerprint anonim generat aleatoriu,
                folosit exclusiv pentru funcționalitatea de reacții (like/dislike) — fără nicio legătură cu identitatea
                utilizatorului.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Date politicieni
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Datele politicienilor afișate sunt informații publice în exercițiul funcției publice, colectate din surse
                oficiale și de presă verificate.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">
                Servicii terțe
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">Tevad.org folosește:</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                <li>Supabase (EU West, Ireland) — stocare date politicieni</li>
                <li>Anthropic Claude API — verificare automată declarații</li>
                <li>Netlify — hosting (EU CDN)</li>
              </ul>
              <p className="mt-4 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Niciun serviciu terț nu primește date personale ale vizitatorilor.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Modificări</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Orice modificare a acestei politici va fi anunțată pe GitHub cu minimum 14 zile înainte de intrarea în
                vigoare.
              </p>
            </section>

            <section className="mt-8 border-t border-[var(--gray-100)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gray-500)]">Contact</h2>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
                Contact:{' '}
                <a className="text-[var(--blue)] hover:underline" href="mailto:contact@tevad.org">
                  contact@tevad.org
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

