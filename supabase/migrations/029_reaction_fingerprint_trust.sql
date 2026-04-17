-- Reaction fingerprint trust (v1.3.0 Tank-Proof)
-- Keyed by the existing anonymous reaction fingerprint hash.

CREATE TABLE IF NOT EXISTS public.reaction_fingerprint_trust (
  fingerprint       TEXT PRIMARY KEY,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_reactions   INTEGER NOT NULL DEFAULT 0,
  distinct_records  INTEGER NOT NULL DEFAULT 0,
  trust_score       REAL NOT NULL DEFAULT 1.0 CHECK (trust_score >= 0 AND trust_score <= 3.0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reaction_fingerprint_trust_updated
  ON public.reaction_fingerprint_trust(updated_at DESC);

ALTER TABLE public.reaction_fingerprint_trust ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reaction_fingerprint_trust_public_read"
  ON public.reaction_fingerprint_trust FOR SELECT USING (true);

CREATE POLICY "reaction_fingerprint_trust_service_write"
  ON public.reaction_fingerprint_trust FOR ALL USING (auth.role() = 'service_role');

