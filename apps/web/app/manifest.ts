import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tevad.org — Te Văd',
    short_name: 'Tevad.org',
    description:
      'Platformă civică pentru responsabilitate politică în România — promisiuni, surse și verificare neutră.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f1f3d',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
