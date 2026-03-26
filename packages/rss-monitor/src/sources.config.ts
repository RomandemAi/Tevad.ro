/**
 * packages/rss-monitor/src/sources.config.ts
 * Tevad.ro — Approved source configuration
 *
 * TIER 1: Verified independent Romanian media
 * - Required: minimum 2 Tier-1 sources for any FALSE verdict
 *
 * TIER 2: Broad reach media — supplementary only
 * - Cannot generate a FALSE verdict alone
 *
 * SOURCE DIVERSITY (#5):
 * Each source carries an optional political lean tag (left/center/right/official).
 * If all sources for a FALSE verdict share the same lean, a third source from
 * a different lean is required — or the verdict defaults to PENDING.
 * This prevents ideologically one-sided take-downs.
 *
 * See SOURCES.md for full policy and excluded sources list.
 */

export type SourceLean = 'left' | 'center' | 'right' | 'official'

export interface SourceConfig {
  outlet: string
  domain: string
  rssUrl: string
  description: string
  lean: SourceLean
}

// ============================================================
// TIER 1 — Verified Independent Romanian Media
// ============================================================
export const TIER1_SOURCES: SourceConfig[] = [
  {
    outlet: 'Recorder',
    domain: 'recorder.ro',
    rssUrl: 'https://recorder.ro/feed/',
    description: '#1 most-cited source in Romania (MediaTRUST 2023). Investigative video journalism.',
    lean: 'center',
  },
  {
    outlet: 'HotNews',
    domain: 'hotnews.ro',
    rssUrl: 'https://www.hotnews.ro/rss',
    description: '~5M unique users/month. Leading independent digital outlet.',
    lean: 'center',
  },
  {
    outlet: 'G4Media',
    domain: 'g4media.ro',
    rssUrl: 'https://www.g4media.ro/feed',
    description: 'Politics, justice, corruption. Investigative. Non-partisan.',
    lean: 'center',
  },
]

// ============================================================
// TIER 2 — Broad Reach Media (supplementary only)
// ============================================================
export const TIER2_SOURCES: SourceConfig[] = [
  {
    outlet: 'Digi24',
    domain: 'digi24.ro',
    rssUrl: 'https://www.digi24.ro/rss',
    description: 'Largest news TV in Romania. Publicly quoted company.',
    lean: 'center',
  },
  {
    outlet: 'ProTV',
    domain: 'protv.ro',
    rssUrl: 'https://stirileprotv.ro/rss.xml',
    description: 'Largest commercial TV. Czech-owned (CME).',
    lean: 'center',
  },
  {
    outlet: 'Europa FM',
    domain: 'europafm.ro',
    rssUrl: 'https://www.europafm.ro/feed/',
    description: 'National radio. Czech-owned. Interview transcripts.',
    lean: 'center',
  },
  {
    outlet: 'Libertatea',
    domain: 'libertatea.ro',
    rssUrl: 'https://www.libertatea.ro/rss',
    description: 'Swiss-owned (Ringier). Broad coverage.',
    lean: 'center',
  },
  {
    outlet: 'Ziarul Financiar',
    domain: 'zf.ro',
    rssUrl: 'https://www.zf.ro/rss',
    description: 'Economic and political reporting.',
    lean: 'center',
  },
]

// ============================================================
// TIER 0 — Official Government Sources (not RSS, scraped directly)
// ============================================================
export const TIER0_SOURCES = [
  { outlet: 'Camera Deputaților', domain: 'cdep.ro', scrapeUrl: 'https://www.cdep.ro', lean: 'official' as const },
  { outlet: 'Senatul României', domain: 'senat.ro', scrapeUrl: 'https://www.senat.ro', lean: 'official' as const },
  { outlet: 'Monitorul Oficial', domain: 'monitoruloficial.ro', scrapeUrl: 'https://www.monitoruloficial.ro', lean: 'official' as const },
  { outlet: 'Parlament Transparent', domain: 'parlament.openpolitics.ro', scrapeUrl: 'https://parlament.openpolitics.ro/export/', lean: 'official' as const },
]

// ============================================================
// EXCLUDED — Never accepted as sources
// ============================================================
export const EXCLUDED_DOMAINS = [
  'antena3.ro',
  'romaniatv.net',
  'realitateaplus.ro',
]

export function isExcluded(domain: string): boolean {
  return EXCLUDED_DOMAINS.some(d => domain.includes(d))
}

export function getSourceTier(domain: string): 0 | 1 | 2 | null {
  if (TIER0_SOURCES.some(s => domain.includes(s.domain))) return 0
  if (TIER1_SOURCES.some(s => domain.includes(s.domain))) return 1
  if (TIER2_SOURCES.some(s => domain.includes(s.domain))) return 2
  if (isExcluded(domain)) return null
  return null
}

export function getSourceLean(domain: string): SourceLean | null {
  const t0 = TIER0_SOURCES.find(s => domain.includes(s.domain))
  if (t0) return t0.lean
  const t1 = TIER1_SOURCES.find(s => domain.includes(s.domain))
  if (t1) return t1.lean
  const t2 = TIER2_SOURCES.find(s => domain.includes(s.domain))
  if (t2) return t2.lean
  return null
}

/**
 * Source diversity check (#5).
 * Returns true if sources are sufficiently diverse for a FALSE verdict.
 * If all Tier-1 sources share one lean, a third independent source is required.
 */
export function passesSourceDiversityCheck(
  sources: Array<{ tier: number; lean?: SourceLean }>
): { passes: boolean; reason?: string } {
  const tier1 = sources.filter(s => s.tier <= 1)
  if (tier1.length < 2) {
    return { passes: false, reason: 'Minimum 2 Tier-1 sources required' }
  }

  // Official sources always pass diversity check
  if (tier1.some(s => s.lean === 'official')) {
    return { passes: true }
  }

  const leans = tier1.map(s => s.lean).filter(Boolean) as SourceLean[]
  const uniqueLeans = new Set(leans)

  // If we have sources from at least 2 different leans, or 3+ sources — passes
  if (uniqueLeans.size >= 2 || tier1.length >= 3) {
    return { passes: true }
  }

  // All sources share the same lean
  if (leans.length >= 2 && uniqueLeans.size === 1) {
    const lean = [...uniqueLeans][0]
    return {
      passes: false,
      reason: `All Tier-1 sources share the same lean (${lean}). Add a source from a different perspective or verdict defaults to PENDING.`,
    }
  }

  return { passes: true }
}
