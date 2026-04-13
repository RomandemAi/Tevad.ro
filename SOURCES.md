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

## Politician roster audit (data quality)

Read-only check of active `politicians` (deputat / senator / cabinet) against the same official lists as the scrapers:

```bash
npm run audit:parliament -w @tevad/scraper
```

Use `--json` for structured output (includes optional `suggestion` with closest roster name + score).

**Wrong or mixed-up identities:** RSS and fuzzy attribution can create rows whose **display name is not the real officeholder** (similar surnames, wrong first name, or someone who is not in that chamber). Treat `not_in_roster` plus a **high `suggestion` score** (same surname, different first name) as the primary queue for manual Supabase fixes: update `politicians.name` / `slug`, merge duplicates, set `is_active = false` for ended mandates, and re-point `records.politician_id` if needed. The deputat roster used in the audit is narrowed with **OpenPolitics** when the CKAN merge would otherwise be huge (`+audit-openpolitics-intersect` or `openpolitics-audit-primary` in the printed source). Use `--full-deputy-roster` only when debugging.

**Iulian Bulai (USR, deputat):** do not use “Alfred / Alfredo Bulai” for the sitting deputy. Migration `018_fix_iulian_bulai_politician.sql` corrects matching rows and re-points `records` when a canonical Iulian Bulai row already exists (`supabase db push` / deploy migrations).

### BEC / legislatura 2024–2028 — bulk import (465 MPs)

Canonical machine-readable roster: [`packages/scraper/data/parlamentari-2024-2028.json`](packages/scraper/data/parlamentari-2024-2028.json), generated from the Romanian Wikipedia tables for [Camera Deputaților](https://ro.wikipedia.org/wiki/Legislatura_2024-2028_(Camera_Deputa%C8%9Bilor)) and [Senat](https://ro.wikipedia.org/wiki/Legislatura_2024-2028_(Senat)) (BEC-cited). The digest on [România Curată](https://www.romaniacurata.ro/lista-parlamentari-mandat-2024-2028/) matches almost entirely but omitted one deputy in the per-county list (Hunedoara); Wikipedia’s table aligns with the 331 + 134 seat totals.

```bash
npm run build:parlamentari-json -w @tevad/scraper      # refresh JSON from Wikipedia API
npm run import:bec-2024:dry -w @tevad/scraper           # validate JSON + slugs only (no DB)
npm run import:bec-2024 -w @tevad/scraper             # upsert into Supabase (service role)
```

Requires `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Slugs use the same collision rules as the deputy scraper (`makeSlug`). This import does **not** deactivate other rows; you may still have extra active `deputat`/`senator` rows from older slug schemes until cleaned up.

---

**Current version: v1.0.0**
**Effective from: 2026-03-25**
