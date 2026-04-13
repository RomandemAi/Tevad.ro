const betaPillClass =
  'inline-flex flex-shrink-0 items-center rounded-[3px] border px-1.5 py-[3px] font-mono text-[8px] font-medium tracking-[0.5px]'

export default function MobileAppNotices() {
  return (
    <div
      className="border-b border-[var(--gray-200)] bg-white/95 px-4 py-2.5 backdrop-blur-sm md:hidden"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
        <span
          className={betaPillClass}
          style={{
            background: 'rgba(245,166,35,0.15)',
            color: '#f5a623',
            borderColor: 'rgba(245,166,35,0.3)',
          }}
        >
          BETA
        </span>
        <span className="font-mono text-[10px] leading-tight tracking-wide text-[var(--gray-600)]">
          Platformă în construire — funcții și date în extindere.
        </span>
      </div>
      <p className="mt-2 font-sans text-[12px] leading-snug text-[var(--gray-700)]">
        Urmărirea responsabilității pornește de la lansare. Completăm registrul în fiecare zi, cu informații
        verificabile și surse publice.
      </p>
    </div>
  )
}
