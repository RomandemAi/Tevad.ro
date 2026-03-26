# Approved Sources — Tevad.ro

This document defines which sources are accepted for record verification, their trust tier, and which sources are excluded.

All source decisions are version-controlled and require community review to change.

---

## Tier 0 — Official Government Records (highest authority)

These always override media sources in case of conflict.

| Source | URL | What it provides |
|---|---|---|
| Camera Deputaților | cdep.ro | 331 deputies, vote records, bills, transcripts |
| Senatul României | senat.ro | 136 senators, vote records |
| Monitorul Oficial | monitoruloficial.ro | Every law passed, official acts |
| Parlament Transparent | parlament.openpolitics.ro | CC-BY-SA-4.0 CSV: all votes, questions, party migration |
| Biroul Electoral Central | bec.ro | Official election results |
| EU Parliament | europarl.europa.eu | MEP votes, EU legislation |
| IPU Parline | data.ipu.org | Structured parliament data (JSON/XML) |

---

## Tier 1 — Verified Independent Romanian Media (primary sources)

Used for statements, promises, and speeches. Minimum 2 Tier-1 sources required for a FALSE verdict.

| Source | URL | Why trusted |
|---|---|---|
| Recorder | recorder.ro | #1 most-cited source in Romania (MediaTRUST 2023). Investigative video journalism. Non-partisan. |
| HotNews | hotnews.ro | ~5M unique users/month. Leading independent digital outlet. High editorial standards. |
| G4Media | g4media.ro | Politics, justice, corruption. Investigative. Widely cited by international press. |

---

## Tier 2 — Broad Reach Media (supplementary evidence only)

Can support a verdict but cannot be the sole source. Cannot generate a FALSE verdict alone.

| Source | URL | Notes |
|---|---|---|
| Digi24 | digi24.ro | Largest news TV. Publicly quoted company. |
| ProTV | protv.ro | Largest commercial TV. Czech-owned (CME). |
| Europa FM | europafm.ro | National radio. Czech-owned. Interview transcripts. |
| Libertatea | libertatea.ro | Swiss-owned (Ringier). Broad coverage. |
| Ziarul Financiar | zf.ro | Economic and political reporting. |
| Adevărul | adevarul.ro | National daily. Use with caution — verify ownership context. |

---

## Excluded Sources

These sources are **never** accepted as evidence on Tevad.ro.

### Excluded — Known Political Bias or CNA Sanctions
| Source | Reason |
|---|---|
| Antena 3 | Active CNA sanctions. Known political alignment. Cannot be primary source. |
| România TV | Active CNA sanctions. Known political alignment. |
| Realitatea Plus | Known political alignment. Multiple CNA sanctions history. |

### Excluded — Structural Conflicts of Interest
| Type | Reason |
|---|---|
| Party-owned publications | Direct conflict of interest |
| Politician personal websites | Self-reporting |
| Party press releases | Self-reporting |
| Social media posts (Facebook, TikTok, X) | Unverified, editable, no editorial standard |
| Anonymous sources | Cannot be archived or verified |
| AI-generated content (external) | Not a primary source |

---

## Adding a New Source

To propose adding a source to any tier, open a GitHub Issue with:
1. Source name and URL
2. Ownership structure
3. Editorial independence evidence
4. MediaTRUST or equivalent credibility rating if available
5. History of CNA sanctions (if any)

Source tier decisions require approval from 2 independent maintainers.

---

## Archived Sources

All source URLs used in records must be archived at time of verification using:
- `web.archive.org` (Wayback Machine)
- `archive.ph`

If a source URL goes dead, the archived version is used. If no archive exists, the record is flagged for re-verification.

---

**Current version: v1.0.0**
**Effective from: 2026-03-25**
