# Contributing to Tevad.ro

Thank you for helping hold Romanian politicians accountable.

There are two ways to contribute: **evidence submissions** and **code contributions**.

---

## Submitting Evidence

Evidence submissions add new records (promises, statements, votes) to the platform, or challenge existing verdicts.

### Requirements

Every evidence submission must include:
- The exact quote or action (verbatim text of the promise/statement, or vote record)
- The politician's name and role at the time
- The date it was made
- **Minimum 2 independent Tier-1 source URLs** (see `SOURCES.md`)
- An archived version of each URL (archive.org or archive.ph)

### How to Submit

1. Open a GitHub Issue with the label `evidence-submission`
2. Use the template below
3. A maintainer will review within 7 days
4. The AI verification pipeline will cross-check your sources
5. If verified, the record is added with your GitHub username credited

### Evidence Submission Template

```
## Evidence Submission

**Politician:** [Full name, party, role]
**Record type:** [PROMISE / STATEMENT / VOTE]
**Date:** [YYYY-MM-DD]
**Text:** [Exact quote or vote description]

**Source 1 (Tier 1):**
- Outlet: [e.g. Recorder.ro]
- URL: [direct link]
- Archived URL: [archive.org or archive.ph link]
- Published date: [YYYY-MM-DD]

**Source 2 (Tier 1):**
- Outlet:
- URL:
- Archived URL:
- Published date:

**Proposed verdict:** [TRUE / FALSE / PARTIAL / PENDING]
**Reasoning:** [Why you believe this verdict is correct, based only on the sources]

**Conflict of interest declaration:**
- [ ] I have no financial relationship with this politician
- [ ] I have no party membership relationship with this politician
- [ ] All source URLs are publicly accessible
```

### Challenging an Existing Verdict

If you believe an existing record has the wrong verdict:

1. Open a GitHub Issue with the label `verdict-challenge`
2. Include the record ID
3. Include at least 1 new Tier-1 source that contradicts the current verdict
4. Archived URL required

Politicians and their representatives are welcome to submit challenges via this process — but through public GitHub Issues only, with sources, like everyone else.

---

## Code Contributions

### Getting Started

```bash
# Clone the repo
git clone https://github.com/RomandemAi/Tevad.ro.git
cd Tevad.ro

# Install dependencies
npm install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# Run Supabase locally
npx supabase start

# Run migrations
npx supabase db push

# Seed dev data
npx supabase db seed

# Start dev server
npm run dev
```

### Branch Naming

```
feature/  — new features
fix/      — bug fixes
data/     — scraper or data updates
docs/     — documentation only
```

### PR Rules

- All PRs require 1 maintainer review
- PRs touching `SCORING.md`, `NEUTRALITY.md`, or `SOURCES.md` require 2 maintainer reviews and 14-day community review
- No PR may introduce political bias — maintainers will close PRs that frame records with editorial language
- Test coverage required for scraper changes

### Issues

Use these labels:
- `evidence-submission` — new record proposals
- `verdict-challenge` — disputes on existing verdicts
- `bug` — technical issues
- `enhancement` — feature requests
- `neutrality` — neutrality charter violations
- `scraper` — data pipeline issues

---

## Code of Conduct

- No political campaigning in Issues or PRs
- No harassment of maintainers or contributors
- Disagreements about verdicts are resolved through sources, not arguments
- The platform is politically neutral — contributions that attempt to introduce bias will be closed

---

*Tevad.ro is built by citizens for citizens. The code is open. The formula is open. The sources are open. That's the whole point.*
