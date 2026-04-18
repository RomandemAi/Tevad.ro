import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        backgroundColor: '#080c12',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(29,110,245,0.12), transparent 55%), linear-gradient(180deg, #0a1018, #080c12 40%)',
        color: '#e2eaf6',
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a94b8]">404</p>
      <h1 className="mt-3 text-lg font-medium">Pagina nu există</h1>
      <Link href="/" className="mt-8 font-mono text-[11px] text-[#0ea5e9] hover:opacity-90">
        ← Înapoi la pagina principală
      </Link>
    </div>
  )
}
