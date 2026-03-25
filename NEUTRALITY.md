# Neutrality Charter — Tevad.ro

Tevad.ro is a neutral public record. It has no political opinion. It does not take sides. It does not favor any party, ideology, or candidate. It only has sources.

This document defines the rules that guarantee that neutrality. These rules are non-negotiable and apply to every contributor, maintainer, and automated system.

---

## The Core Principle

Tevad.ro answers exactly one question per record:

> "Was this true, or was it not?"

It does not answer:
- "Was this a good idea?"
- "Should this policy exist?"
- "Is this politician bad?"

---

## Rules

### Rule 01 — No Editorial Opinion
Every record contains only verifiable facts:
- What was said / promised / voted
- When it was said
- Where it was said (source URL)
- What happened after (outcome)
- AI verdict: TRUE / FALSE / PARTIAL / PENDING

No adjectives. No commentary. No framing language. The record is the record.

### Rule 02 — Equal Treatment of All Parties
Every politician on Tevad.ro goes through the identical verification process regardless of:
- Party affiliation (PSD, PNL, USR, AUR, independent — same rules)
- Political position (left, right, center)
- Current role (PM, senator, deputy, president)
- Public popularity

If a verification process or scoring weight applies to one politician, it applies to all.

### Rule 03 — Minimum 2 Independent Sources for FALSE
A record can only receive a FALSE verdict if:
- At least 2 independent Tier-1 sources confirm the falsity
- Both sources must be independently verified (not citing each other)
- OR 1 Tier-1 source + official government record (Monitorul Oficial, cdep.ro vote log)

One source is never enough for a FALSE verdict. Doubt defaults to PENDING.

### Rule 04 — Official Records Override Media
When a conflict exists between a media source and an official government record:
- `monitoruloficial.ro` — wins always
- `cdep.ro` vote log — wins always
- `senat.ro` vote log — wins always
- EU official records — win always

Official records are the ground truth. Media is supporting evidence.

### Rule 05 — No Anonymous Sources
Every source cited in a record must:
- Be publicly accessible via URL
- Be archived (Wayback Machine or equivalent)
- Be attributable to a named outlet

Anonymous tips, unverifiable leaks, and off-record statements are not accepted as evidence.

### Rule 06 — Politicians Cannot Influence Verdicts
Politicians and their representatives cannot:
- Submit rebuttals through the platform
- Request removal of records
- Contact maintainers to change verdicts

If a politician believes a record is incorrect, the only valid path is a public Tier-1 source that contradicts the verdict. That source can be submitted via the standard CONTRIBUTING.md process — by anyone, not specifically by the politician.

### Rule 07 — Contributor Declarations
Any contributor submitting evidence must declare:
- No financial relationship with the politician in question
- No party membership relationship with the politician in question
- Full source URLs at time of submission

Undeclared conflicts of interest result in the contribution being rejected and the contributor being flagged.

### Rule 08 — AI Transparency
Every AI-generated verdict must include:
- The Claude model version used
- The sources fed to the model
- The confidence score (0–100)
- The reasoning summary

AI verdicts are not final — they are reviewed against the source chain and can be challenged via Rule 06.

### Rule 09 — Score Formula is Public
The credibility score formula is documented in `SCORING.md`, version-controlled, and cannot be changed without a public PR and community review period of minimum 14 days.

### Rule 10 — No Advertiser Influence
Tevad.ro accepts no advertising from:
- Political parties or candidates
- Government entities
- Entities with active lobbying relationships with tracked politicians

Funding sources are disclosed in `FUNDING.md`.

---

## Enforcement

Violations of this charter are handled via GitHub Issues tagged `[neutrality]`. Any maintainer found violating these rules is removed from the maintainer list.

---

*This charter is version-controlled. Any changes require a public PR, minimum 14-day community review, and explicit approval from 2 independent maintainers.*
