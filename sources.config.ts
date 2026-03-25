/**
 * packages/rss-monitor/src/sources.config.ts
 * Tevad.ro — Approved source configuration
 *
 * TIER 1: Verified independent Romanian media
 * - Required: minimum 2 Tier-1 sources for any FALSE verdict
 * - These are the only sources that can generate a FALSE verdict alone
 *
 * TIER 2: Broad reach media — supplementary only
 * - Cannot generate a FALSE verdict alone
 * - Used to corroborate Tier-1 findings
 *
 * See SOURCES.md for full policy and excluded sources list.
 */

export interface SourceConfig {
  outlet: string
  domain: string
  rssUrl: string
  description: string
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
  },
  {
    outlet: 'HotNews',
    domain: 'hotnews.ro',
    rssUrl: 'https://www.hotnews.ro/rss',
    description: '~5M unique users/month. Leading independent digital outlet.',
  },
  {
    outlet: 'G4Media',
    domain: 'g4media.ro',
    rssUrl: 'https://www.g4media.ro/feed',
    description: 'Politics, justice, corruption. Investigative. Non-partisan.',
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
  },
  {
    outlet: 'ProTV',
    domain: 'protv.ro',
    rssUrl: 'https://stirileprotv.ro/rss.xml',
    description: 'Largest commercial TV. Czech-owned (CME).',
  },
  {
    outlet: 'Europa FM',
    domain: 'europafm.ro',
    rssUrl: 'https://www.europafm.ro/feed/',
    description: 'National radio. Czech-owned. Interview transcripts.',
  },
  {
    outlet: 'Libertatea',
    domain: 'libertatea.ro',
    rssUrl: 'https://www.libertatea.ro/rss',
    description: 'Swiss-owned (Ringier). Broad coverage.',
  },
  {
    outlet: 'Ziarul Financiar',
    domain: 'zf.ro',
    rssUrl: 'https://www.zf.ro/rss',
    description: 'Economic and political reporting.',
  },
]

// ============================================================
// TIER 0 — Official Government Sources (not RSS, scraped directly)
// These always override media in case of conflict.
// ============================================================
export const TIER0_SOURCES = [
  { outlet: 'Camera Deputaților', domain: 'cdep.ro', scrapeUrl: 'https://www.cdep.ro' },
  { outlet: 'Senatul României', domain: 'senat.ro', scrapeUrl: 'https://www.senat.ro' },
  { outlet: 'Monitorul Oficial', domain: 'monitoruloficial.ro', scrapeUrl: 'https://www.monitoruloficial.ro' },
  { outlet: 'Parlament Transparent', domain: 'parlament.openpolitics.ro', scrapeUrl: 'https://parlament.openpolitics.ro/export/' },
]

// ============================================================
// EXCLUDED — Never accepted as sources
// ============================================================
export const EXCLUDED_DOMAINS = [
  'antena3.ro',       // Active CNA sanctions, known political alignment
  'romaniatv.net',    // Active CNA sanctions
  'realitateaplus.ro', // Known political alignment
  // Party/politician owned media — blocked by policy
  // Social media direct posts — not accepted
  // Anonymous sources — not accepted
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
