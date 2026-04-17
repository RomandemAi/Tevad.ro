-- Source freshness / link-rot signals (v1.3.0 Tank-Proof)
-- Non-breaking: optional columns with safe defaults.

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS http_status INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_sources_last_checked
  ON public.sources(last_checked_at DESC);

