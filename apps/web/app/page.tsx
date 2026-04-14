import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getSiteUrl } from '@/lib/site-url'
import HomeHero from '@/components/HomeHero'
import HomeHowItWorksSection from '@/components/HomeHowItWorksSection'
import HomeNeutralitySection from '@/components/HomeNeutralitySection'
import StatsBar from '@/components/StatsBar'
import HomeSpotlightSection, {
  type SpotlightPolitician,
  type SpotlightPromise,
} from '@/components/HomeSpotlightSection'
import PoliticianList from '@/components/PoliticianList'
import { dedupePoliticiansByNameIdentity, dedupeSpotlightPoliticians } from '@/lib/dedupe-politicians'

const homeDescription =
  'Monitorizare politicieni România: promisiuni, declarații și voturi cu surse, scor de credibilitate și verificare neutră. „Te văd.” — registru civic deschis.'

export const metadata: Metadata = {
  title: { absolute: 'Tevad.org — Te Văd · România' },
  description: homeDescription,
  alternates: { canonical: `${getSiteUrl()}/` },
  openGraph: {
    title: 'Tevad.org — Te Văd · România',
    description: homeDescription,
    url: getSiteUrl(),
  },
  twitter: {
    title: 'Tevad.org — Te Văd · România',
    description: homeDescription,
  },
}

export const revalidate = 120

export default async function HomePage() {
  const supabase = createClient()

  const [
    politiciansRes,
    promisesCountRes,
    brokenPromisesRes,
    stoppedDeclRes,
    spotlightPoliticiansRes,
    spotlightPromisesRes,
  ] = await Promise.all([
    supabase
      .from('politicians')
      // Use * so DBs without optional columns (e.g. before migration 013 avatar_url) still return rows.
      .select('*')
      .eq('is_active', true)
      .order('score', { ascending: false }),
    supabase.from('records').select('id', { count: 'exact', head: true }).eq('type', 'promise'),
    supabase.from('records').select('id', { count: 'exact', head: true }).eq('type', 'promise').eq('status', 'false'),
    supabase
      .from('politicians')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('declaration_stopped_after_ccr', true),
    supabase
      .from('politicians')
      .select('id, slug, name, role, party_short, score, chamber')
      .eq('is_active', true)
      .in('chamber', ['premier', 'president'])
      .not('name', 'ilike', '%galerie%')
      .not('name', 'ilike', '%cabinetul%')
      .order('chamber', { ascending: true }),
    supabase
      .from('records')
      .select('id, slug, text, status, date_made, politicians ( slug, name, party_short )')
      .eq('type', 'promise')
      .eq('impact_level', 'high')
      .order('date_made', { ascending: false })
      .limit(8),
  ])

  const { data: politicians, error } = politiciansRes
  if (error) console.error('Failed to load politicians:', error)

  if (promisesCountRes.error) console.error('Hero count (promises):', promisesCountRes.error.message)
  if (brokenPromisesRes.error) console.error('Hero count (broken):', brokenPromisesRes.error.message)
  if (stoppedDeclRes.error) console.error('Hero count (stopped decl):', stoppedDeclRes.error.message)

  const totalPromisesTracked = promisesCountRes.count ?? 0
  const totalPromisesBroken = brokenPromisesRes.count ?? 0
  const stoppedDeclarationsCount = stoppedDeclRes.count ?? 0

  const list = dedupePoliticiansByNameIdentity(politicians ?? [])
  const total = list.length
  const scoreOf = (p: (typeof list)[number]) => Number(p.score ?? 0)
  const broken = list.reduce((a, p) => a + (p.records_false ?? 0), 0)
  const pending = list.reduce((a, p) => a + (p.records_pending ?? 0), 0)
  const avgScore = total > 0 ? Math.round(list.reduce((a, p) => a + scoreOf(p), 0) / total) : 0

  const spotlightPoliticians = dedupeSpotlightPoliticians(
    (spotlightPoliticiansRes.data ?? []) as SpotlightPolitician[]
  )
  type JoinedPol = { slug: string; name: string; party_short: string | null }
  const spotlightPromises: SpotlightPromise[] = (spotlightPromisesRes.data ?? [])
    .map(row => {
      const raw = row as {
        id: string
        slug: string
        text: string
        status: string
        date_made: string
        politicians: JoinedPol | JoinedPol[] | null
      }
      const pol = Array.isArray(raw.politicians) ? raw.politicians[0] : raw.politicians
      if (!pol) return null
      return {
        id: raw.id,
        slug: raw.slug,
        text: raw.text,
        status: raw.status,
        date_made: raw.date_made,
        politician: pol,
      }
    })
    .filter((x): x is SpotlightPromise => x != null)

  return (
    <AppShell>
      <HomeHero
        totalPoliticiansMonitored={total}
        totalBrokenPromises={totalPromisesBroken}
        stoppedDeclarationsCount={stoppedDeclarationsCount}
      />
      <HomeNeutralitySection />
      <HomeHowItWorksSection />
      <StatsBar total={total} broken={broken} pending={pending} avgScore={avgScore} />
      <HomeSpotlightSection politicians={spotlightPoliticians} promises={spotlightPromises} />
      <PoliticianList politicians={list} />
    </AppShell>
  )
}
