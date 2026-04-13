'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, backgroundColor: '#080c12', color: '#e2eaf6', fontFamily: 'system-ui, sans-serif' }}>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p style={{ color: '#3d5070', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Tevad.ro — eroare critică
          </p>
          <p style={{ color: '#7a94b8', maxWidth: 420, fontSize: 14, lineHeight: 1.6 }}>
            {error.message || 'Layout-ul aplicației nu s-a putut încărca.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: '1px solid #243550',
              color: '#0ea5e9',
              background: 'transparent',
              padding: '10px 20px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Reîncearcă
          </button>
        </div>
      </body>
    </html>
  )
}
