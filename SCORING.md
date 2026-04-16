# Credibility Score Formula — Tevad.ro

The credibility score is a number between 0 and 100. It is calculated automatically from **five** public components. The formula is version-controlled, and cannot be changed without community review.

---

## Formula

```
credibility_score = round(
  (score_promises     * 0.28) +
  (score_declaratii  * 0.12) +
  (score_reactions    * 0.18) +
  (score_sources      * 0.22) +
  (score_consistency  * 0.20)
)
```

All component scores are integers from 0 to 100. Weights sum to **1.0**.

---

## Component Definitions

### score_promises (weight: 28%)

Measures the ratio of kept vs broken **promises** only (`records.type = 'promise'`). Rows with **`opinion_exempt = true`** are excluded: they are not treated as checkable factual claims for scoring.

```
kept     = records where status = 'true'
broken   = records where status = 'false'
partial  = records where status = 'partial'
total    = kept + broken + partial  (pending excluded)

score_promises = round(
  ((kept * 1.0) + (partial * 0.5)) / max(total, 1) * 100
)
```

If a politician has **no** verified promise rows (true/false/partial), `score_promises = 50` (neutral default).

---

### score_declaratii (weight: 12%)

Same truth-mix formula as promises, but only for **declarații / statements** (`records.type = 'statement'`). Excluded rows:

- **`opinion_exempt = true`** — same rationale as under promises.
- **`impact_level = 'low'`** — classified at verification time (AI, **statements only**) as personal / lifestyle / no meaningful public-policy stake; the line can stay on the site with a factual verdict, but it does not move this subscore. Promises and votes are **never** given this AI materiality pass; they use the verdict JSON without `impact_level`, and promise scoring does not filter by `impact_level`.

This subscore reflects **factual verification of claims we treat as material for public-policy accountability**, not moral or leadership credit.

```
kept     = statement records where status = 'true'
broken   = statement records where status = 'false'
partial  = statement records where status = 'partial'
total    = kept + broken + partial

score_declaratii = round(
  ((kept * 1.0) + (partial * 0.5)) / max(total, 1) * 100
)
```

If there are **no** verified statement rows, `score_declaratii = 50` (neutral default).

---

### score_reactions (weight: 18%)

Measures public sentiment across all records for this politician.

```
For each record:
  record_sentiment = likes / max(likes + dislikes, 1)

score_reactions = round(
  average(record_sentiment for all records) * 100
)
```

Reactions are rate-limited per fingerprint (1 reaction per record per device per 24h) to prevent manipulation.

If a politician has zero reactions, `score_reactions = 50` (neutral default).

---

### score_sources (weight: 22%)

Measures the quality and quantity of verified sources across all records.

```
For each record:
  source_quality = 1.0 if any Tier-1 source exists
                   0.6 if only Tier-2 sources exist
                   0.3 if only Tier-3 sources exist (not recommended)
                   1.2 if official government source exists (capped at 1.0)

  multi_source_bonus = 0.1 if record has ≥ 2 independent sources (capped at 1.0 total)

  record_source_score = min(source_quality + multi_source_bonus, 1.0)

score_sources = round(
  average(record_source_score for all records) * 100
)
```

---

### score_consistency (weight: 20%)

Measures whether a politician's positions are consistent over time.

```
contradictions = count of record pairs where:
  - same topic
  - opposite positions
  - date_b > date_a (later statement contradicts earlier)
  - both records have status != 'pending'

total_topics = count of distinct topics with ≥ 2 records

consistency_ratio = 1 - (contradictions / max(total_topics, 1))

score_consistency = round(max(consistency_ratio, 0) * 100)
```

If a politician has fewer than 3 records, `score_consistency = 50` (neutral default).

---

## Score Labels

| Score | Label | Color |
|---|---|---|
| 75–100 | Credibil | Green |
| 45–74 | Discutabil | Amber |
| 20–44 | Problematic | Red |
| 0–19 | Toxic | Dark Red |

---

## Score History

Every score recalculation is logged in the `score_history` table with:

- Previous score and new score
- Delta (derived)
- Subscores written on the event, including `score_promises_new`, `score_declaratii_new`, `score_reactions_new`, `score_sources_new`, `score_consistency_new`
- Reason (e.g. new_record, reaction_update, full_recalc)
- Timestamp

This creates a full audit trail of how every politician's score changed over time.

---

## Formula Changes

Any change to weights or component formulas requires:

1. A public GitHub PR with full explanation
2. Minimum 14-day community review period
3. Approval from 2 independent maintainers
4. Version bump in this file
5. Recalculation of all existing scores with the new formula
6. Public announcement

**Current version: v1.2.0**  
**Effective from: 2026-04-16**

### v1.2.0 (declarații materiality)

- Verification prompt **v1.2.0**: models output **`impact_level` only when STATEMENT TYPE is STATEMENT**; for PROMISE or VOTE they return verdict JSON **without** `impact_level` (no AI “importance” judgment on promises).
- `score_declaratii` excludes verified statements with **`impact_level = 'low'`** (in addition to `opinion_exempt`).

### v1.1.1 (clarification + scoring filter)

- Promise and declarație **truth-mix** subscores ignore rows with `opinion_exempt = true` (aligned with verification: no falsifiable verdict).

### v1.1.0 — deploy checklist

1. Apply migration `supabase/migrations/023_score_declaratii.sql` on production (Supabase SQL Editor, linked `supabase db push`, or `supabase db query -f … --db-url …`). This adds `politicians.score_declaratii` and `score_history.score_declaratii_new`.
2. After DDL, wait briefly if PostgREST reports schema cache errors (`PGRST204`); they clear after the cache refreshes.
3. Run a full backfill: `npm run score:recalc` (uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env`).

---

*This formula is version-controlled. The score is math — not opinion.*
