# Te Văd · Tevad.ro

> **"Te văd."** — I see you.

Romania's open-source political accountability platform. Every promise tracked. Every vote recorded. Every statement verified. AI-powered. Source-cited. Neutral by design.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Phase 01 — Scaffold](https://img.shields.io/badge/Status-Phase%2001%20Scaffold-orange)]()
[![Made in Romania](https://img.shields.io/badge/Made%20in-România-blue)]()
[![Open Source](https://img.shields.io/badge/Open-Source-green)]()

---

## What is Tevad.ro?

Tevad.ro is a public truth ledger for Romanian politicians. It tracks:

- **Campaign promises** — made before elections
- **Official statements & speeches** — on record, with sources
- **Voting records** — every bill, every vote, For / Against / Absent
- **Policy positions over time** — do they contradict themselves?

Each entry is AI-verified using Claude, cross-referenced with a minimum of 2 independent Tier-1 sources. Citizens can react (like / dislike) but cannot comment — the record speaks for itself.

Every politician gets a **Credibility Score** (0–100) calculated from:
- Promise kept/broken ratio
- Public reaction sentiment
- Verified source citations
- Time-in-office consistency

The score is public, the formula is public, the code is public. No hidden weights. No editorial opinion. No political affiliation.

---

## The Name

**"Te văd"** is Romanian for **"I see you."**

Not a threat. Not a judgment. Just a fact. The permanent, calm, undeniable presence of the public record. Politicians speak in public. Their words belong to the public. Tevad.ro just keeps them organized.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| AI Verification | Anthropic Claude API |
| Hosting | Vercel |
| Scrapers | Node.js cron workers |
| RSS Monitor | Recorder.ro, HotNews.ro, G4Media.ro feeds |
| Parliament Data | cdep.ro + senat.ro scraper + OpenPolitics CSV |
| Monorepo | Turborepo |

---

## Data Sources

### Official (Tier 0 — always overrides media)
- `cdep.ro` — Camera Deputaților (331 deputies, vote records)
- `senat.ro` — Senatul României (136 senators)
- `parlament.openpolitics.ro` — CC-BY-SA-4.0 CSV export (all votes, questions, party migration)
- `monitoruloficial.ro` — Every law that passed

### Verified Media (Tier 1 — primary sources for statements)
- **Recorder.ro** — #1 most-cited source in Romania (MediaTRUST 2023)
- **HotNews.ro** — ~5M unique users/month, independent
- **G4Media.ro** — Politics, justice, corruption, investigative

### Broad Reach Media (Tier 2 — supplementary only)
- Digi24.ro, ProTV.ro, Europa FM

### Excluded
- Party-owned media
- Outlets with active CNA misinformation sanctions
- Politician self-press / party websites
- Anonymous sources

---

## Neutrality Rules

1. No editorial opinion — only: promised / happened / sources confirm or deny
2. All parties treated identically — same process for PSD, PNL, USR, AUR, everyone
3. Minimum 2 independent Tier-1 sources required for any FALSE verdict
4. Politicians cannot submit rebuttals through the platform
5. Credibility score is math — public formula, auditable by anyone
6. Official records (Monitorul Oficial, cdep.ro votes) always override media
7. No anonymous sources — every record must have a permanent, archived URL

Full rules: [NEUTRALITY.md](NEUTRALITY.md)

---

## Scoring Formula

```
credibility_score = (
  score_promises * 0.35 +
  score_reactions * 0.20 +
  score_sources  * 0.25 +
  score_consistency * 0.20
) / 100
```

Full methodology: [SCORING.md](SCORING.md)

---

## Project Structure

```
tevad.ro/
├── apps/
│   └── web/                  # Next.js 14 frontend
│       ├── app/
│       │   ├── page.tsx              # Homepage / leaderboard
│       │   ├── politician/[slug]/    # Politician profile
│       │   ├── promises/             # All promises
│       │   ├── broken/               # Broken promises
│       │   └── api/                  # API routes
│       └── components/
├── packages/
│   ├── scraper/              # cdep.ro + senat.ro scrapers
│   │   ├── cdep.ts
│   │   ├── senat.ts
│   │   └── monitorul.ts
│   ├── rss-monitor/          # Tier-1 source watchers
│   │   ├── feed-watcher.ts
│   │   └── sources.config.ts
│   └── verifier/             # Claude AI verification pipeline
│       ├── verify.ts
│       └── score.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_politicians.sql
│   │   ├── 002_records.sql
│   │   ├── 003_sources.sql
│   │   ├── 004_reactions.sql
│   │   └── 005_score_history.sql
│   └── seed.sql
├── NEUTRALITY.md
├── SCORING.md
├── SOURCES.md
├── CONTRIBUTING.md
└── README.md
```

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 01 — Scaffold | 🟡 In Progress | Repo, DB schema, seed data, static UI |
| 02 — Scrapers | ⬜ Planned | cdep.ro + senat.ro + OpenPolitics import |
| 03 — AI Verify | ⬜ Planned | Claude pipeline, RSS monitor, score engine |
| 04 — Launch | ⬜ Planned | tevad.ro live, open source community |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit evidence, report inaccuracies, or contribute code.

Key rules:
- All evidence submissions require a minimum of 2 Tier-1 source URLs
- No party affiliation accepted from contributors on political judgments
- Code contributions welcome from anyone

---

## License

MIT — fork it, build your own country's version. Just credit Tevad.ro.

---

*Built by [Romandem AI](https://romandemai.com) · Bucharest, România · 2026*
*"Te văd." — I see you.*
