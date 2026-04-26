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
 * Tier-1 outlets tagged `center` may appear together (independent editorial consensus).
 * If every Tier-1 source shares the same non-center lean, a FALSE verdict is blocked
 * (pending) until perspectives diversify.
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
    outlet: 'HotNews (Politic)',
    domain: 'hotnews.ro',
    rssUrl: 'https://hotnews.ro/c/actualitate/politic/feed',
    description: 'Politics-only feed (higher politician mention rate than the global RSS).',
    lean: 'center',
  },
  {
    outlet: 'G4Media',
    domain: 'g4media.ro',
    rssUrl: 'https://www.g4media.ro/feed',
    description: 'Politics, justice, corruption. Investigative. Non-partisan.',
    lean: 'center',
  },
  {
    outlet: 'G4Media (Politică tag)',
    domain: 'g4media.ro',
    rssUrl: 'https://www.g4media.ro/tag/politica/feed',
    description: 'Politics tag feed (higher politician mention rate than the global RSS).',
    lean: 'center',
  },
  {
    outlet: 'Newsweek România',
    domain: 'newsweek.ro',
    rssUrl: 'https://newsweek.ro/feed',
    description: 'Politics and policy reporting (RO edition).',
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
    outlet: 'Digi24 (Politică)',
    domain: 'digi24.ro',
    rssUrl: 'https://www.digi24.ro/rss/Stiri/Actualitate/Politica',
    description: 'Politics-only feed (higher politician mention rate than the global RSS).',
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
  {
    outlet: 'Europa Liberă',
    domain: 'romania.europalibera.org',
    rssUrl: 'https://romania.europalibera.org/api/zvo_mml-vomx-tpeukvm_',
    description: 'RFE/RL Romania. News + politics reporting; RSS via /api/* feed endpoints.',
    lean: 'center',
  },
  {
    outlet: 'Profit.ro',
    domain: 'profit.ro',
    rssUrl: 'https://www.profit.ro/rss',
    description: 'Business + politics. High frequency; includes a Politic section.',
    lean: 'center',
  },
  {
    outlet: 'Buletin de București',
    domain: 'buletin.de',
    rssUrl: 'https://buletin.de/bucuresti/category/stiri/feed',
    description: 'Local investigations/news (Bucharest) with frequent political/administrative coverage.',
    lean: 'center',
  },
  {
    outlet: 'Romania Insider',
    domain: 'romania-insider.com',
    rssUrl: 'https://www.romania-insider.com/feed',
    description: 'English-language Romania news (politics/economy).',
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
// PRIMARY SOURCES — Direct politician statements (not journalism)
// Treated as Tier 1 with lean='official'.
// Pass diversity checks automatically (politician's own words need
// no corroborating perspective — the statement IS the record).
// ============================================================
export const PRIMARY_SOURCES = [
  {
    outlet: 'X (Twitter)',
    domain: 'x.com',
    altDomain: 'twitter.com',
    description: 'Direct posts from the politician\'s official verified X account.',
    lean: 'official' as const,
  },
]

export function isPrimarySource(domainOrUrl: string): boolean {
  return PRIMARY_SOURCES.some(
    s => domainOrUrl.includes(s.domain) || domainOrUrl.includes(s.altDomain)
  )
}

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
  if (isPrimarySource(domain)) return 1
  if (TIER1_SOURCES.some(s => domain.includes(s.domain))) return 1
  if (TIER2_SOURCES.some(s => domain.includes(s.domain))) return 2
  if (isExcluded(domain)) return null
  return null
}

export function getSourceLean(domain: string): SourceLean | null {
  const t0 = TIER0_SOURCES.find(s => domain.includes(s.domain))
  if (t0) return t0.lean
  if (isPrimarySource(domain)) return 'official'
  const t1 = TIER1_SOURCES.find(s => domain.includes(s.domain))
  if (t1) return t1.lean
  const t2 = TIER2_SOURCES.find(s => domain.includes(s.domain))
  if (t2) return t2.lean
  return null
}

/** Alias: political lean for a source domain or URL host substring. */
export function getLean(domainOrUrl: string): SourceLean | null {
  return getSourceLean(domainOrUrl)
}

/**
 * Source diversity check (#5) for FALSE verdicts.
 * - Official (Tier 0 / lean official) always passes.
 * - All Tier-1 tagged `center` passes (independent center outlets are acceptable).
 * - At least two distinct leans among Tier 1 passes (e.g. center + left).
 * - Fails only when every Tier-1 source has a lean and they are all the same **non-center** lean.
 * Sources missing `lean` do not trigger a diversity block (avoid false negatives from incomplete metadata).
 */
export function passesSourceDiversityCheck(
  sources: Array<{ tier: number; lean?: SourceLean }>
): { passes: boolean; reason?: string } {
  const tier1 = sources.filter(s => s.tier <= 1)
  if (tier1.length < 2) {
    return { passes: false, reason: 'Minimum 2 Tier-1 sources required' }
  }

  if (tier1.some(s => s.lean === 'official')) {
    return { passes: true }
  }

  const tagged = tier1.filter((s): s is typeof s & { lean: SourceLean } => s.lean != null)
  if (tagged.length < tier1.length) {
    return { passes: true }
  }

  const leans = tagged.map(s => s.lean)
  const uniqueLeans = new Set(leans)

  if (uniqueLeans.size >= 2) {
    return { passes: true }
  }

  if (uniqueLeans.size === 1) {
    const lean = Array.from(uniqueLeans)[0]
    if (lean === 'center') {
      return { passes: true }
    }
    return {
      passes: false,
      reason: `All Tier-1 sources share the same non-center lean (${lean}). Add a center-balanced or other-perspective source; FALSE verdict defaults to PENDING.`,
    }
  }

  return { passes: true }
}

/** True if the URL is a direct politician statement (X/Twitter post). */
export function isDirectStatement(url: string): boolean {
  return isPrimarySource(url)
}
