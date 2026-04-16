import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import type { MetadataRoute } from 'next'

const siteBase = getSiteUrl()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()
  const { data: politicians } = await supabase.from('politicians').select('slug, updated_at').eq('is_active', true)

  const politicianUrls = (politicians || []).map(p => ({
    url: `${siteBase}/politician/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const now = new Date()

  return [
    { url: siteBase, lastModified: now, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${siteBase}/promises`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${siteBase}/declaratii`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${siteBase}/broken`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.75 },
    { url: `${siteBase}/verified`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.75 },
    { url: `${siteBase}/despre`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
    { url: `${siteBase}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.65 },
    { url: `${siteBase}/cum-functioneaza`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: `${siteBase}/neutralitate`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: `${siteBase}/legal`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.45 },
    { url: `${siteBase}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.45 },
    ...politicianUrls,
  ]
}

