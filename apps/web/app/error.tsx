'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center font-mono"
      style={{ backgroundColor: '#080c12', color: '#e2eaf6' }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#3d5070' }}>
        Eroare încărcare
      </p>
      <p className="max-w-md text-[13px] leading-relaxed" style={{ color: '#7a94b8' }}>
        {error.message || 'A apărut o eroare neașteptată.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="border px-4 py-2 text-[11px] uppercase tracking-wide transition-colors"
        style={{ borderColor: '#243550', color: '#0ea5e9' }}
      >
        Reîncearcă
      </button>
    </div>
  )
}
