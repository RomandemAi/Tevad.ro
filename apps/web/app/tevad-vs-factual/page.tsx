import type { Metadata } from 'next'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Tevad vs Factual — Tevad.org',
  description:
    'Comparație între Tevad.org și modelul clasic de fact-checking: verificare, scor, transparență, viteză și comunitate.',
}

type Row = {
  feature: string
  factual: string
  tevad: string
}

const ROWS: Row[] = [
  {
    feature: 'Verification method',
    factual:
      'Flux editorial clasic: articole și checklist-uri, adesea cu coadă umană înainte de publicare.',
    tevad:
      'Pipeline automat pe înregistrări (promisiuni, declarații, voturi), surse obligatorii și reguli identice pentru toți politicienii.',
  },
  {
    feature: 'Scoring system',
    factual:
      'De obicei verdict discret (adevărat / fals / parțial) per articol, fără agregare clară pe persoană în timp real.',
    tevad:
      'Scor de credibilitate agregat, ponderat pe surse, consistență și reacții — cu istoric public în score_history.',
  },
  {
    feature: 'Transparency',
    factual:
      'Metodologie publicată, dar detaliile per verdict rămân în spatele redacției.',
    tevad:
      'Audit pe înregistrare, surse tier, prompturi versionate în repo și traseu reproductibil cât permite legea.',
  },
  {
    feature: 'Speed',
    factual:
      'Bun la evenimente punctuale; actualizarea catalogului de promisiuni și voturi e lentă prin natura editorială.',
    tevad:
      'Cron-uri, RSS și scrapere pe surse oficiale — intră în verificare fără să aștepte „runda de redacție”.',
  },
  {
    feature: 'AI ensemble',
    factual:
      'Model unic sau workflow redacțional fără consens formal între motoare independente.',
    tevad:
      'Ansamblu multi-model cu vot majoritar și ieșire strict JSON; dezacord → pending, nu „opinie unică”.',
  },
  {
    feature: 'Community input',
    factual:
      'Tipic: formular sau email către redacție; feedback-ul nu intră direct în motorul de scor.',
    tevad:
      'Reacții și semnale de pe înregistrări integrate în modelul de încredere (cu limite anti-abuz).',
  },
  {
    feature: 'Link-rot & freshness protection',
    factual:
      'Articole statice; linkurile moarte se corectează când apucă cineva.',
    tevad:
      'Reverificare programată, health pe surse, arhive (ex. ANI) și penalități de prospețime în scor.',
  },
  {
    feature: 'Open-source',
    factual:
      'Produs închis; îmbunătățirile depind de echipa proprietară.',
    tevad:
      'Cod public (MIT), issue-uri și PR-uri: poți verifica exact ce rulează, nu doar broșura.',
  },
]

export default function TevadVsFactualPage() {
  const breadcrumb = (
    <>
      <Link href="/" className="text-[var(--gray-900)] transition-colors hover:text-[var(--blue)]">
        POLITICIENI
      </Link>
      <span className="text-[var(--gray-500)]"> / </span>
      <span className="text-[var(--gray-500)]">TEVAD VS FACTUAL</span>
    </>
  )

  return (
    <AppShell breadcrumb={breadcrumb}>
      <div className="tev-page-fill flex-1 overflow-y-auto">
        <div className="relative border-b border-[var(--gray-200)] bg-gradient-to-br from-[#0b1220] via-[#0f1c33] to-[#0b1220] px-4 py-12 text-white md:px-8 md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" aria-hidden />
          <div className="relative mx-auto max-w-[920px] text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">Comparație publică</p>
            <h1 className="mt-4 font-sans text-[26px] font-bold leading-[1.15] tracking-tight md:text-[36px]">
              Tevad.ro vs Factual.ro — Why Romania deserves better
            </h1>
            <p className="mx-auto mt-5 max-w-[62ch] font-sans text-[15px] leading-relaxed text-white/72 md:text-[16px]">
              Nu e război personal — e despre ce înseamnă responsabilitate la scară națională. Un site îmbătrânește
              frumos; celălalt e făcut să țină pasul cu Parlamentul, guvernul și internetul care putrezește în fiecare
              zi.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex min-h-[48px] min-w-[220px] items-center justify-center rounded-xl bg-[var(--green)] px-8 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_40px_rgba(22,163,74,0.35)] transition-transform duration-200 ease-out hover:scale-[1.02] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220] active:scale-[0.99]"
              >
                Try Tevad Now
              </Link>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                Gratis · fără cont · surse publice
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[980px] px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--gray-500)]">
                Față în față
              </h2>
              <p className="mt-2 max-w-[56ch] font-sans text-[14px] leading-relaxed text-[var(--gray-600)]">
                Aceeași țară, două filozofii. O coloană e conservatoare prin design; cealaltă e construită pentru
                date, repetabilitate și obrazul tău când citești sursa la 2 noaptea.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[var(--gray-400)]">
              Factual.ro e menționat ca reper de piață, nu ca țintă personală.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--gray-200)] bg-white shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <th
                      scope="col"
                      className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gray-500)] md:px-6"
                    >
                      Feature
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--gray-500)] md:px-6"
                    >
                      Factual.ro
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--green)] md:px-6"
                    >
                      Tevad.ro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-[var(--gray-100)] transition-colors duration-150 hover:bg-[var(--gray-50)]/80 ${
                        i === ROWS.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className="align-top px-4 py-4 font-sans text-[13px] font-semibold text-[var(--gray-900)] md:px-6 md:py-5 md:text-[14px]"
                      >
                        {row.feature}
                      </th>
                      <td className="align-top px-4 py-4 font-sans text-[13px] leading-relaxed text-[var(--gray-600)] md:px-6 md:py-5 md:text-[14px]">
                        {row.factual}
                      </td>
                      <td className="align-top bg-[rgba(22,163,74,0.06)] px-4 py-4 font-sans text-[13px] leading-relaxed text-[var(--gray-800)] md:px-6 md:py-5 md:text-[14px]">
                        <span className="text-[var(--green)]">{row.tevad}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-6 rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-6 py-8 md:flex-row md:px-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gray-500)]">Verdict scurt</p>
              <p className="mt-2 max-w-[48ch] font-sans text-[15px] font-medium leading-snug text-[var(--gray-900)]">
                Dacă vrei un articol elegant despre o minciună, ai opțiuni. Dacă vrei un sistem care nu doarme când
                politicienii votează la miezul nopții, ai deja tab-ul deschis greșit — corectează asta.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex shrink-0 min-h-[48px] min-w-[200px] items-center justify-center rounded-xl border-2 border-[var(--green)] bg-white px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--green)] shadow-sm transition-all duration-200 hover:bg-[var(--green)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2"
            >
              Try Tevad Now
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
