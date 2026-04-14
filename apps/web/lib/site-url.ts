/**
 * Canonical public origin for metadata, sitemap, robots, and JSON-LD.
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://tevad.org).
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://tevad.org').replace(/\/$/, '')
}
