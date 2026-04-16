-- Contradiction pairs (transparent, non-editorial)

CREATE TABLE IF NOT EXISTS public.contradiction_pairs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id   UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,

  record_a_id     UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  record_b_id     UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,

  -- record_b is later than record_a (chronological direction)
  record_a_date   DATE,
  record_b_date   DATE,

  strength        REAL CHECK (strength >= 0 AND strength <= 1),
  explanation     TEXT,

  detected_at     TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT contradiction_pairs_distinct_records CHECK (record_a_id <> record_b_id)
);

-- Avoid duplicate storage of the same pair (order-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_contradiction_pairs_pair
  ON public.contradiction_pairs(politician_id, LEAST(record_a_id, record_b_id), GREATEST(record_a_id, record_b_id));

-- Optimized conflict target for upserts (chronological direction).
CREATE UNIQUE INDEX IF NOT EXISTS uq_contradiction_pairs_directed
  ON public.contradiction_pairs(politician_id, record_a_id, record_b_id);

CREATE INDEX IF NOT EXISTS idx_contradiction_pairs_politician
  ON public.contradiction_pairs(politician_id, detected_at DESC);

ALTER TABLE public.contradiction_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contradiction_pairs_public_read"
  ON public.contradiction_pairs FOR SELECT USING (true);

CREATE POLICY "contradiction_pairs_service_write"
  ON public.contradiction_pairs FOR ALL USING (auth.role() = 'service_role');

