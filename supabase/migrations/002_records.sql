-- Migration 002: records
-- Tevad.ro — Te Văd · Romania Political Accountability
-- Created: 2026-03-25

CREATE TYPE record_type AS ENUM ('promise', 'statement', 'vote');
CREATE TYPE record_status AS ENUM ('true', 'false', 'partial', 'pending');

CREATE TABLE IF NOT EXISTS public.records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id       UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
  slug                TEXT NOT NULL UNIQUE,

  -- Content
  type                record_type NOT NULL,
  text                TEXT NOT NULL,
  context             TEXT,
  topic               TEXT,

  -- Verdict
  status              record_status NOT NULL DEFAULT 'pending',
  status_label_ro     TEXT GENERATED ALWAYS AS (
    CASE status
      WHEN 'true'    THEN 'Adevărat'
      WHEN 'false'   THEN 'Fals'
      WHEN 'partial' THEN 'Parțial'
      WHEN 'pending' THEN 'În verificare'
    END
  ) STORED,

  -- Dates
  date_made           DATE NOT NULL,
  date_verified       TIMESTAMPTZ,

  -- AI Verification
  ai_verdict          record_status,
  ai_confidence       INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
  ai_reasoning        TEXT,
  ai_model            TEXT,
  ai_verified_at      TIMESTAMPTZ,

  -- Reactions (denormalized for performance)
  likes               INTEGER DEFAULT 0,
  dislikes            INTEGER DEFAULT 0,

  -- Impact
  impact_level        TEXT DEFAULT 'medium' CHECK (impact_level IN ('high', 'medium', 'low')),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_records_politician ON public.records(politician_id);
CREATE INDEX idx_records_status ON public.records(status);
CREATE INDEX idx_records_type ON public.records(type);
CREATE INDEX idx_records_topic ON public.records(topic);
CREATE INDEX idx_records_date ON public.records(date_made DESC);
CREATE INDEX idx_records_impact ON public.records(impact_level);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_records_updated_at
BEFORE UPDATE ON public.records
FOR EACH ROW EXECUTE FUNCTION update_records_updated_at();

-- Trigger to update politician record counts when a record is added/updated
CREATE OR REPLACE FUNCTION sync_politician_record_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.politicians
  SET
    total_records    = (SELECT COUNT(*) FROM public.records WHERE politician_id = NEW.politician_id),
    records_true     = (SELECT COUNT(*) FROM public.records WHERE politician_id = NEW.politician_id AND status = 'true'),
    records_false    = (SELECT COUNT(*) FROM public.records WHERE politician_id = NEW.politician_id AND status = 'false'),
    records_partial  = (SELECT COUNT(*) FROM public.records WHERE politician_id = NEW.politician_id AND status = 'partial'),
    records_pending  = (SELECT COUNT(*) FROM public.records WHERE politician_id = NEW.politician_id AND status = 'pending')
  WHERE id = NEW.politician_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_record_counts
AFTER INSERT OR UPDATE ON public.records
FOR EACH ROW EXECUTE FUNCTION sync_politician_record_counts();

-- RLS
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "records_public_read"
  ON public.records FOR SELECT
  USING (true);

CREATE POLICY "records_service_write"
  ON public.records FOR ALL
  USING (auth.role() = 'service_role');
