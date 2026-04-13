export default function HomeNeutralitySection() {
  return (
    <section className="tev-neutrality-section" aria-label="Neutralitate și audit">
      {/* Light veil — enough to keep text AA contrast, map still reads as “România” */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-100/25"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1100px] px-6 py-10 md:px-10 md:py-12">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gray-600)]">
          Neutralitate · audit
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
          Tevad nu are opinie politică — doar surse, înregistrări verificabile și scoruri calculate după o formulă
          publică. Fiecare verdict poate fi urmărit până la sursă.
        </p>
      </div>
    </section>
  )
}
