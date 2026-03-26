-- Migration 006: verdict_audit_logs
-- Tevad.ro — Te Văd · Romania Political Accountability
-- Created: 2026-03-26
--
-- Full audit trail for every AI verification decision.
-- Every verdict is logged here permanently — including the exact
-- sources fed to the model and the raw reasoning returned.
-- Public read access: anyone can audit any verdict via /audit/[record-id].

CREATE TABLE IF NOT EXISTS public.verdict_audit_logs (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id               UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  politician_id           UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,

  -- Verdict
  verdict                 TEXT NOT NULL CHECK (verdict IN ('true', 'false', 'partial', 'pending')),
  confidence              INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  reasoning               TEXT,

  -- Model info
  model_version           TEXT NOT NULL,        -- e.g. 'claude-sonnet-4-6'
  blind_verified          BOOLEAN NOT NULL DEFAULT TRUE,  -- was politician identity hidden?

  -- Multi-model cross-check (#4)
  secondary_model_version TEXT,                 -- e.g. 'claude-haiku-4-5'
  secondary_verdict       TEXT CHECK (secondary_verdict IN ('true', 'false', 'partial', 'pending', NULL)),
  secondary_confidence    INTEGER,
  models_agreed           BOOLEAN,              -- NULL if only one model used

  -- Sources transparency
  sources_fed             JSONB,                -- exact sources sent to model
  can_be_decided          BOOLEAN,
  requires_more_sources   BOOLEAN,

  -- Source diversity check (#5)
  diversity_check_passed  BOOLEAN,
  diversity_check_reason  TEXT,

  -- System prompt version used
  system_prompt_version   TEXT DEFAULT 'v1.0.0',

  recorded_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_record ON public.verdict_audit_logs(record_id);
CREATE INDEX idx_audit_politician ON public.verdict_audit_logs(politician_id);
CREATE INDEX idx_audit_date ON public.verdict_audit_logs(recorded_at DESC);
CREATE INDEX idx_audit_verdict ON public.verdict_audit_logs(verdict);
CREATE INDEX idx_audit_models_agreed ON public.verdict_audit_logs(models_agreed);

ALTER TABLE public.verdict_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read — full transparency
CREATE POLICY "audit_public_read"
  ON public.verdict_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "audit_service_write"
  ON public.verdict_audit_logs FOR ALL
  USING (auth.role() = 'service_role');
