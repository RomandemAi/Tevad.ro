-- Migration 001: politicians
-- Tevad.ro — Te Văd · Romania Political Accountability
-- Created: 2026-03-25

CREATE TABLE IF NOT EXISTS public.politicians (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  role                TEXT NOT NULL,
  party               TEXT,
  party_short         TEXT,
  chamber             TEXT CHECK (chamber IN ('deputat', 'senator', 'europarlamentar', 'presedinte', 'premier', 'ministru', 'primar')),
  constituency        TEXT,
  mandate_start       DATE,
  mandate_end         DATE,
  is_active           BOOLEAN DEFAULT TRUE,
  initials            TEXT GENERATED ALWAYS AS (
    upper(left(split_part(name, ' ', 1), 1) || left(split_part(name, ' ', 2), 1))
  ) STORED,

  -- Credibility score (0-100)
  score               INTEGER DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  score_promises      INTEGER DEFAULT 50 CHECK (score_promises >= 0 AND score_promises <= 100),
  score_reactions     INTEGER DEFAULT 50 CHECK (score_reactions >= 0 AND score_reactions <= 100),
  score_sources       INTEGER DEFAULT 50 CHECK (score_sources >= 0 AND score_sources <= 100),
  score_consistency   INTEGER DEFAULT 50 CHECK (score_consistency >= 0 AND score_consistency <= 100),

  -- Record counts (denormalized for performance)
  total_records       INTEGER DEFAULT 0,
  records_true        INTEGER DEFAULT 0,
  records_false       INTEGER DEFAULT 0,
  records_partial     INTEGER DEFAULT 0,
  records_pending     INTEGER DEFAULT 0,

  -- Metadata
  cdep_id             TEXT,        -- ID from cdep.ro
  senat_id            TEXT,        -- ID from senat.ro
  avatar_color        TEXT,        -- hex background for avatar
  avatar_text_color   TEXT,        -- hex text color for avatar

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_politicians_slug ON public.politicians(slug);
CREATE INDEX idx_politicians_party ON public.politicians(party);
CREATE INDEX idx_politicians_chamber ON public.politicians(chamber);
CREATE INDEX idx_politicians_score ON public.politicians(score DESC);
CREATE INDEX idx_politicians_active ON public.politicians(is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_politicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_politicians_updated_at
BEFORE UPDATE ON public.politicians
FOR EACH ROW EXECUTE FUNCTION update_politicians_updated_at();

-- RLS
ALTER TABLE public.politicians ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "politicians_public_read"
  ON public.politicians FOR SELECT
  USING (true);

-- Only service role can write (scrapers use service role key)
CREATE POLICY "politicians_service_write"
  ON public.politicians FOR ALL
  USING (auth.role() = 'service_role');
