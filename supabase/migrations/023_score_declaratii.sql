-- Credibility subscore for declarații (statements), parallel to score_promises.

ALTER TABLE public.politicians
  ADD COLUMN IF NOT EXISTS score_declaratii INTEGER NOT NULL DEFAULT 50
  CHECK (score_declaratii >= 0 AND score_declaratii <= 100);

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS score_declaratii_new INTEGER;

COMMENT ON COLUMN public.politicians.score_declaratii IS 'Subscore 0–100 from verified statements (type=statement) truth mix; rolled into main score.';
