import type { Metadata } from 'next'
import { DM_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
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
      <body className="bg-[#080c12] text-[#e2eaf6] antialiased">
        {children}
      </body>
    </html>
  )
}
