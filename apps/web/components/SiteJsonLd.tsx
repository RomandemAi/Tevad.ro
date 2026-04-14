import { getSiteUrl } from '@/lib/site-url'

const GH_REPO = 'https://github.com/RomandemAi/Tevad.ro'

export default function SiteJsonLd() {
  const base = getSiteUrl()
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'Tevad.org',
        alternateName: ['Te Văd', 'tevad'],
        url: base,
        description:
          'Platformă civică open-source pentru responsabilitate politică în România — promisiuni, surse și verificare neutră.',
        sameAs: [GH_REPO],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'Tevad.org',
        inLanguage: 'ro-RO',
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
