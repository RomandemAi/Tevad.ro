-- Migration 003: sources
-- Tevad.ro — Te Văd · Romania Political Accountability
-- Created: 2026-03-25

CREATE TYPE source_tier AS ENUM ('0', '1', '2');

CREATE TABLE IF NOT EXISTS public.sources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,

  tier            source_tier NOT NULL DEFAULT '1',
  outlet          TEXT NOT NULL,       -- e.g. 'Recorder', 'HotNews', 'cdep.ro'
  url             TEXT NOT NULL,
  archived_url    TEXT,                -- Wayback Machine or archive.ph
  title           TEXT,
  published_at    DATE,
  scraped_at      TIMESTAMPTZ DEFAULT NOW(),

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_record ON public.sources(record_id);
CREATE INDEX idx_sources_tier ON public.sources(tier);
CREATE INDEX idx_sources_outlet ON public.sources(outlet);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sources_public_read"
  ON public.sources FOR SELECT USING (true);

CREATE POLICY "sources_service_write"
  ON public.sources FOR ALL USING (auth.role() = 'service_role');


-- Migration 004: reactions
-- Rate-limited by fingerprint (device hash, 1 reaction per record per 24h)

CREATE TYPE reaction_type AS ENUM ('like', 'dislike');

CREATE TABLE IF NOT EXISTS public.reactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  type            reaction_type NOT NULL,
  fingerprint     TEXT NOT NULL,       -- hashed device identifier, not PII
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one reaction per fingerprint per record
CREATE UNIQUE INDEX idx_reactions_unique
  ON public.reactions(record_id, fingerprint);

CREATE INDEX idx_reactions_record ON public.reactions(record_id);
CREATE INDEX idx_reactions_type ON public.reactions(type);

-- Trigger to sync reaction counts on records table
CREATE OR REPLACE FUNCTION sync_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  r_likes    INTEGER;
  r_dislikes INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE type = 'like'),
    COUNT(*) FILTER (WHERE type = 'dislike')
  INTO r_likes, r_dislikes
  FROM public.reactions
  WHERE record_id = COALESCE(NEW.record_id, OLD.record_id);

  UPDATE public.records
  SET likes = r_likes, dislikes = r_dislikes
  WHERE id = COALESCE(NEW.record_id, OLD.record_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_reactions
AFTER INSERT OR UPDATE OR DELETE ON public.reactions
FOR EACH ROW EXECUTE FUNCTION sync_reaction_counts();

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Public can read reaction counts (via records table)
-- Public can insert reactions (anonymous, fingerprinted)
CREATE POLICY "reactions_public_insert"
  ON public.reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "reactions_public_read"
  ON public.reactions FOR SELECT USING (true);

CREATE POLICY "reactions_service_all"
  ON public.reactions FOR ALL USING (auth.role() = 'service_role');


-- Migration 005: score_history
-- Full audit trail of every credibility score change

CREATE TABLE IF NOT EXISTS public.score_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id   UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,

  score_prev      INTEGER,
  score_new       INTEGER NOT NULL,
  delta           INTEGER GENERATED ALWAYS AS (score_new - COALESCE(score_prev, 50)) STORED,

  score_promises_new    INTEGER,
  score_reactions_new   INTEGER,
  score_sources_new     INTEGER,
  score_consistency_new INTEGER,

  reason          TEXT NOT NULL,  -- e.g. 'new_record', 'reaction_update', 'source_added', 'formula_change'
  record_id       UUID REFERENCES public.records(id) ON DELETE SET NULL,

  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_score_history_politician ON public.score_history(politician_id);
CREATE INDEX idx_score_history_date ON public.score_history(recorded_at DESC);

ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_history_public_read"
  ON public.score_history FOR SELECT USING (true);

CREATE POLICY "score_history_service_write"
  ON public.score_history FOR ALL USING (auth.role() = 'service_role');
