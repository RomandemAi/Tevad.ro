-- AI annotations for claim kind / measurability (non-editorial, transparent).
-- Stores model output as JSON-like fields, separate from verdicts.

CREATE TABLE IF NOT EXISTS public.record_ai_annotations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  politician_id   UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,

  claim_kind      TEXT NOT NULL CHECK (claim_kind IN ('future_promise', 'present_fact', 'opinion_only', 'mixed')),
  measurability   TEXT NOT NULL CHECK (measurability IN ('high', 'medium', 'low', 'non_falsifiable')),
  suggested_type  TEXT NOT NULL CHECK (suggested_type IN ('promise', 'statement', 'vote')),

  confidence      INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning       TEXT,
  model_version   TEXT NOT NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_ai_annotations_record
  ON public.record_ai_annotations(record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_record_ai_annotations_politician
  ON public.record_ai_annotations(politician_id, created_at DESC);

ALTER TABLE public.record_ai_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "record_ai_annotations_public_read"
  ON public.record_ai_annotations FOR SELECT USING (true);

CREATE POLICY "record_ai_annotations_service_write"
  ON public.record_ai_annotations FOR ALL USING (auth.role() = 'service_role');

