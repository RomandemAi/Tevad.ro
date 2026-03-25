# Credibility Score Formula — Tevad.ro

The credibility score is a number between 0 and 100. It is calculated automatically from four components. The formula is public, version-controlled, and cannot be changed without community review.

---

## Formula

```
credibility_score = round(
  (score_promises    * 0.35) +
  (score_reactions   * 0.20) +
  (score_sources     * 0.25) +
  (score_consistency * 0.20)
)
```

All four component scores are integers from 0 to 100.

---

## Component Definitions

### score_promises (weight: 35%)
Measures the ratio of kept vs broken promises and statements.

```
kept     = records where status = 'true'
broken   = records where status = 'false'
partial  = records where status = 'partial'
total    = kept + broken + partial  (pending excluded)

score_promises = round(
  ((kept * 1.0) + (partial * 0.5)) / max(total, 1) * 100
)
```

If a politician has zero verified records, `score_promises = 50` (neutral default).

---

### score_reactions (weight: 20%)
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

### score_sources (weight: 25%)
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
- Previous score
- New score
- Delta
- Reason (new_record / reaction_update / source_update / formula_change)
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

**Current version: v1.0.0**
**Effective from: 2026-03-25**

---

*This formula is version-controlled. The score is math — not opinion.*
