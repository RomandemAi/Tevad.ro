import { createClient as createServerClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()
  const { data: politicians } = await supabase.from('politicians').select('slug, updated_at').eq('is_active', true)

  const politicianUrls = (politicians || []).map(p => ({
    url: `https://tevadorg.netlify.app/politician/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: 'https://tevadorg.netlify.app', priority: 1.0 },
    { url: 'https://tevadorg.netlify.app/despre', priority: 0.9 },
    { url: 'https://tevadorg.netlify.app/legal', priority: 0.5 },
    { url: 'https://tevadorg.netlify.app/privacy', priority: 0.5 },
    ...politicianUrls,
  ]
}

