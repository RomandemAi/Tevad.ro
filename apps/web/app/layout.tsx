import type { Metadata } from 'next'
import { DM_Mono, DM_Sans } from 'next/font/google'
import './critical.css'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  preload: false,
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Tevad.ro — Te Văd · România',
  description:
    '"Te văd." — Romania\'s open-source political accountability platform. Every promise tracked. Every vote recorded. Every statement verified. AI-powered. Source-cited. Neutral by design.',
  keywords: [
    'transparenta politica romania',
    'promisiuni politicieni',
    'accountabilitate politica',
    'tevad',
    'te vad',
    'romania politica',
  ],
  openGraph: {
    title: 'Tevad.ro — Te Văd · România',
    description: '"Te văd." — Romania\'s political accountability platform.',
    url: 'https://tevad.ro',
    siteName: 'Tevad.ro',
    locale: 'ro_RO',
    type: 'website',
    images: [{ url: '/images/about-bg.jpg', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://tevad.ro'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-[var(--gray-50)] text-[var(--gray-900)] antialiased">
        <a
          href="#main-content"
          className="pointer-events-none fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-[var(--navy)] px-4 py-2 font-mono text-[12px] font-medium text-white opacity-0 transition-transform focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)] focus:ring-offset-2"
        >
          Sari la conținut
        </a>
        {children}
      </body>
    </html>
  )
}
