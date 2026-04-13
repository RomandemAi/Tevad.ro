-- Migration 007: extended audit transparency (raw model I/O, blind payload, review flag)

ALTER TABLE public.verdict_audit_logs
  ADD COLUMN IF NOT EXISTS blind_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_primary TEXT,
  ADD COLUMN IF NOT EXISTS response_secondary TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.verdict_audit_logs.blind_payload IS 'Exact blind payload sent to models (no politician identity)';
COMMENT ON COLUMN public.verdict_audit_logs.response_primary IS 'Raw primary model output';
COMMENT ON COLUMN public.verdict_audit_logs.response_secondary IS 'Raw secondary model output';
