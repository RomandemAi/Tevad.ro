# Te Văd · Tevad.org

> **"Te văd."** — I see you.

Romania’s open-source political accountability platform. Promises and public statements are tracked on the record, verified with **Anthropic Claude**, and cited to **archived public sources**. Neutral by design: no editorial column, auditable math for the credibility score.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-orange)]()
[![Made in Romania](https://img.shields.io/badge/Made%20in-România-blue)]()
[![Open Source](https://img.shields.io/badge/Open-Source-green)]()

**Live site:** [tevad.org](https://tevad.org) · **Repository:** [github.com/RomandemAi/Tevad.ro](https://github.com/RomandemAi/Tevad.ro)

---

## What is Tevad?

**Tevad.org** is a public ledger for Romanian politicians. Today it focuses on:

- **Campaign promises** — tracked with verification status and sources  
- **Public statements (declarații)** — same pipeline; materiality filters apply only to how some lines affect scoring (see [SCORING.md](SCORING.md))  
- **Structured record types** — the data model also supports **vote** rows where parliament data is ingested; the UI can surface them alongside promises and statements  
- **Per-record audit pages** — transparency fields, verdict context, and (where available) AI-assisted metadata such as claim measurability (always labeled as indicative)  
- **Contradiction pairs** — when the verifier flags tension between two records, the politician profile can surface that block for review  

Citizens can **react** (like / dislike) on records; there is **no** public comment thread — the record and its sources are the story.

Each politician has a **credibility score (0–100)** built from public subscores (promises, declarații, reactions, sources, consistency). Weights and definitions are in [SCORING.md](SCORING.md); the implementation lives in `packages/verifier`.

The **web app** supports **Aspect**: luminos / întunecat / **Sistem** (follows the device color scheme), persisted in the browser.

---

## The Name

**"Te văd"** is Romanian for **"I see you."**

Not a threat. Not a judgment. Just a fact. The permanent, calm, undeniable presence of the public record. Politicians speak in public. Their words belong to the public. Tevad keeps them organized and checkable.

---

## Stack

| Layer | Technology |
|--------|--------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL, RLS, migrations under `supabase/migrations/`) |
| AI verification | Anthropic Claude (`packages/verifier`) |
| Hosting | **Netlify** (`netlify.toml`, `@netlify/plugin-nextjs`) |
| Scheduled work | Next.js **Route Handlers** under `apps/web/app/api/cron/*` (secured with `CRON_SECRET`) |
| RSS ingestion | `packages/rss-monitor` |
| Parliament & gov scrapers | `packages/scraper` (cdep, senat, gov, BEC, ANI, etc.) |
| Monorepo | npm workspaces + **Turborepo** |

---

## Data sources

### Official (Tier 0 — overrides media where applicable)

- **cdep.ro** / **senat.ro** — chamber sites and structured data paths used by scrapers  
- **parlament.openpolitics.ro** — CC-BY-SA-4.0 CSV and related exports where integrated  
- **monitoruloficial.ro** — legal gazette (scraper support in repo)

### Verified media (Tier 1 — primary for many statements)

- **Recorder.ro**, **HotNews.ro**, **G4Media.ro** — among feeds configured in `packages/rss-monitor`

### Broader media (Tier 2 — supplementary)

- e.g. Digi24, ProTV, Europa FM — where listed in source configuration

### Excluded (by policy)

- Party-owned media, sanctioned outlets, politician self-press without independent corroboration, anonymous sources  

Details and tiers: **[SOURCES.md](SOURCES.md)**

---

## Neutrality

Rules are documented in **[NEUTRALITY.md](NEUTRALITY.md)** — in short: same process for all parties, no hidden editorial “take”, minimum sourcing discipline for strong verdicts, and official records respected when they govern a fact.

---

## Credibility score (summary)

Full methodology: **[SCORING.md](SCORING.md)**

```
credibility_score = round(
  (score_promises     * 0.28) +
  (score_declaratii   * 0.12) +
  (score_reactions    * 0.18) +
  (score_sources      * 0.22) +
  (score_consistency  * 0.20)
)
```

All subscores are integers **0–100**; weights sum to **1.0**.

---

## Repository layout

```
Tevad.ro/
├── apps/
│   └── web/                      # Next.js site (tevad.org)
│       ├── app/                  # Routes: /, /promises, /declaratii, /broken, /verified,
│       │                         # /politician/[slug], /audit/[recordId], /about, /despre,
│       │                         # /legal, /privacy, /neutralitate, /cum-functioneaza, …
│       └── app/api/              # react + cron/* (RSS, verify, scrapers, score-recalc, …)
├── packages/
│   ├── scraper/                  # Parliament & government data collectors
│   ├── rss-monitor/            # Feed watcher + queue drain
│   └── verifier/               # Claude verify pipeline, scoring, contradictions helper
├── supabase/
│   ├── migrations/               # Schema evolution (001+, votes, queue, scoring, …)
│   └── seed.sql
├── prompts/                      # Shared prompt assets where referenced
├── netlify.toml
├── turbo.json
├── SCORING.md · NEUTRALITY.md · SOURCES.md · CONTRIBUTING.md
└── package.json                  # Root scripts (see below)
```

---

## Scripts (root)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Turborepo dev (web app default **port 3001** in `apps/web`) |
| `npm run build` | Production build |
| `npm run lint` / `npm run type-check` | Quality gates |
| `npm run verify:run` | Run verifier CLI against queued records |
| `npm run score:recalc` | Recompute politician scores |
| `npm run rss:watch` / `npm run rss:drain` | RSS monitor |
| `npm run verify:contradict` | Contradiction pass (Sonnet path in verifier) |
| `npm run scrape:cdep` / `scrape:senat` / `scrape:gov` / … | Scraper entrypoints |
| `npm run audit:parliament -w @tevad/scraper` | Roster audit (read-only; needs service role in env) |

Web-app helpers (see `apps/web/package.json`): e.g. `cron:rss`, `cron:cdep-steno`.

---

## Getting started

```bash
git clone https://github.com/RomandemAi/Tevad.ro.git
cd Tevad.ro
npm install

# Environment for the Next app (and align with scraper/verifier if you run them)
cp apps/web/.env.example apps/web/.env.local
# Fill at least: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY (server/cron), ANTHROPIC_API_KEY, CRON_SECRET (production crons)
```

**Supabase (local):**

```bash
npx supabase start
# Prefer a full local reset (migrations + supabase/seed.sql):
npx supabase db reset
# Or apply migrations only without wiping data:
npx supabase db push
```

**Run the site:**

```bash
npm run dev
# Open http://localhost:3001 (see apps/web dev script)
```

---

## Deployment (Netlify)

- Build: `npm ci --include=dev && npm run build -w web` (see `netlify.toml`)  
- Set **`CRON_SECRET`** and call cron routes with `Authorization: Bearer <CRON_SECRET>`  
- Set **`NEXT_PUBLIC_APP_URL`** to your canonical public URL (e.g. `https://tevad.org`)  

Cron entrypoints live under `apps/web/app/api/cron/` (RSS watch, verify, scrapers, score recalc, contradict, etc.).

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for evidence, corrections, and code contributions.

---

## License

**MIT** — fork it, adapt it for another country, credit the project.

---

*Tevad.org — proiect civic independent · România · 2026*  
*"Te văd." — I see you.*
