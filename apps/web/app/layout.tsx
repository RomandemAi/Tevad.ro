import type { Metadata } from 'next'
import { DM_Mono, DM_Sans } from 'next/font/google'
import SiteJsonLd from '@/components/SiteJsonLd'
import { getSiteUrl } from '@/lib/site-url'
import './critical.css'
import './globals.css'
import { appearanceBootScript } from '@/lib/appearance'
import AppearanceLayoutEffect from '@/components/AppearanceLayoutEffect'

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

const site = getSiteUrl()
const defaultTitle = 'Tevad.org — Te Văd · România'
const defaultDescription =
  '„Te văd.” — platformă deschisă de responsabilitate politică în România: promisiuni urmărite, surse citate, verificare AI neutră. Open source.'

export const metadata: Metadata = {
  title: {
    default: defaultTitle,
    template: '%s · Tevad.org',
  },
  description: defaultDescription,
  keywords: [
    'tevad.org',
    'te vad',
    'transparenta politica romania',
    'promisiuni politicieni',
    'accountabilitate politica',
    'romania politica',
    'fact checking politica',
  ],
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: site,
    siteName: 'Tevad.org',
    locale: 'ro_RO',
    type: 'website',
    images: [{ url: '/images/about-bg.jpg', width: 1200, height: 630, alt: 'Tevad.org' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/images/about-bg.jpg'],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(site),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} />
      </head>
      <body className="bg-[var(--gray-50)] text-[var(--gray-900)] antialiased">
        <AppearanceLayoutEffect />
        <SiteJsonLd />
        <a
          href="#main-content"
          className="pointer-events-none fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-[var(--navy)] px-4 py-2 font-mono text-[12px] font-medium text-white opacity-0 transition-transform focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
        >
          Sari la conținut
        </a>
        {children}
      </body>
    </html>
  )
}
