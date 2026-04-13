interface HomeHeroProps {
  totalPoliticiansMonitored: number
  totalBrokenPromises: number
  stoppedDeclarationsCount: number
}

const gridStyle = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
  backgroundSize: '40px 40px',
} as const

const heroBackdrop = {
  backgroundImage: `
    linear-gradient(165deg, rgba(15, 31, 61, 0.88) 0%, rgba(15, 31, 61, 0.92) 50%, rgba(15, 31, 61, 0.9) 100%),
    url(/images/bg-shield.png)
  `,
  backgroundSize: '100% 100%, min(100%, 1024px) auto',
  backgroundRepeat: 'no-repeat, no-repeat',
  backgroundPosition: 'center, center 38%',
} as const

/* Civic blue + cyan + hint of gold (RO tricolor echo) — ties hero to light sections below */
const heroAccent = {
  backgroundImage: `radial-gradient(ellipse 80% 55% at 100% 0%, rgba(29, 110, 245, 0.18), transparent 55%),
    radial-gradient(ellipse 70% 50% at 0% 100%, rgba(14, 165, 233, 0.14), transparent 50%),
    radial-gradient(ellipse 55% 35% at 50% 100%, rgba(234, 179, 8, 0.07), transparent 58%)`,
} as const

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function HomeHero({
  totalPoliticiansMonitored,
  totalBrokenPromises,
  stoppedDeclarationsCount,
}: HomeHeroProps) {
  return (
    <section
      className="relative isolate w-full overflow-hidden border-b border-[rgba(255,255,255,0.08)] text-center"
      aria-labelledby="home-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--navy)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-95" style={heroBackdrop} aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2] md:opacity-[0.26]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(15, 31, 61, 0.45) 0%, transparent 38%),
            url(/images/bg-neural.png)`,
          backgroundSize: '100% 100%, min(100%, 1024px) auto',
          backgroundRepeat: 'no-repeat, no-repeat',
          backgroundPosition: 'center, 92% 42%',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0" style={heroAccent} aria-hidden />
      <div className="pointer-events-none absolute inset-0" style={gridStyle} aria-hidden />
      {/* Bottom blend into page — reduces harsh cut to neutrality / stats */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-24 bg-gradient-to-b from-transparent via-[rgba(15,31,61,0.35)] to-[var(--gray-50)] md:h-32"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6 py-10 md:px-10 md:py-20">
        <h1
          id="home-hero-heading"
          className="mx-auto max-w-[700px] font-mono text-[32px] font-light leading-[1.1] tracking-[-1px] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] md:text-[64px]"
        >
          Promisiunile nu expiră.
        </h1>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-[3px] text-[rgba(255,255,255,0.78)] drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)] md:mt-4">
          ROMÂNIA · OPEN SOURCE · NEUTRAL · AI-VERIFIED
        </p>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-8 divide-y divide-[rgba(255,255,255,0.12)] md:mt-12 md:flex-row md:justify-center md:gap-0 md:divide-y-0 md:divide-x">
          <div className="w-full pt-2 text-center md:w-auto md:px-10 md:pt-0">
            <div className="font-mono text-[40px] font-light leading-none tabular-nums text-[#0ea5e9] drop-shadow-sm md:text-[48px]">
              {totalPoliticiansMonitored}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.78)] drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
              Politicieni monitorizați
            </div>
          </div>
          <div className="hidden h-12 w-px self-center bg-[rgba(255,255,255,0.12)] md:block" aria-hidden />
          <div className="w-full pt-6 text-center md:w-auto md:px-10 md:pt-0">
            <div className="font-mono text-[40px] font-light leading-none tabular-nums text-[#f87171] drop-shadow-sm md:text-[48px]">
              {totalBrokenPromises}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.78)] drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
              Promisiuni false
            </div>
          </div>
          <div className="hidden h-12 w-px self-center bg-[rgba(255,255,255,0.12)] md:block" aria-hidden />
          <div className="w-full pt-6 text-center md:w-auto md:px-10 md:pt-0">
            <div className="font-mono text-[40px] font-light leading-none tabular-nums text-[#fbbf24] drop-shadow-sm md:text-[48px]">
              {stoppedDeclarationsCount}
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.78)] drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
              Declarații oprite (CCR)
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl border-t border-[rgba(255,255,255,0.12)] pt-6 md:mt-12">
          <p className="mx-auto flex max-w-xl items-center justify-center gap-2 text-center font-mono text-[10px] leading-relaxed text-[rgba(255,255,255,0.76)] drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)] md:text-[11px]">
            <LockIcon className="flex-shrink-0 text-[rgba(255,255,255,0.72)]" />
            <span>
              Surse verificate Tier-1 · AI blind verification · Audit public complet
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
