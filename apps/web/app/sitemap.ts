import { createClient as createServerClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

const siteBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://tevad.org').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()
  const { data: politicians } = await supabase.from('politicians').select('slug, updated_at').eq('is_active', true)

  const politicianUrls = (politicians || []).map(p => ({
    url: `${siteBase}/politician/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: siteBase, priority: 1.0 },
    { url: `${siteBase}/despre`, priority: 0.9 },
    { url: `${siteBase}/legal`, priority: 0.5 },
    { url: `${siteBase}/privacy`, priority: 0.5 },
    ...politicianUrls,
  ]
}

