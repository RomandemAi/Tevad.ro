-- Migration 022: parliament votes (Senat first)
-- Tevad.ro — votes ingestion from official sources.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parliament_chamber') THEN
    CREATE TYPE parliament_chamber AS ENUM ('senat', 'cdep');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parliament_ballot') THEN
    CREATE TYPE parliament_ballot AS ENUM ('for', 'against', 'abstain', 'present_not_voted', 'absent', 'unknown');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.parliament_votes (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chamber                   parliament_chamber NOT NULL,
  source                    TEXT NOT NULL, -- e.g. 'senat.ro'
  external_id               TEXT NOT NULL, -- e.g. Senat AppID (GUID)
  source_url                TEXT NOT NULL,

  vote_date                 DATE,
  vote_kind                 TEXT,          -- e.g. 'vot final'
  code                      TEXT,          -- e.g. 'L125/2025'
  title                     TEXT,
  description               TEXT,

  present                   INTEGER,
  for_count                 INTEGER,
  against_count             INTEGER,
  abstain_count             INTEGER,
  present_not_voted_count   INTEGER,

  fetched_at                TIMESTAMPTZ DEFAULT NOW(),
  raw_json                  JSONB,

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (chamber, external_id)
);

CREATE TABLE IF NOT EXISTS public.parliament_vote_group_totals (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id                 UUID NOT NULL REFERENCES public.parliament_votes(id) ON DELETE CASCADE,
  group_name              TEXT NOT NULL,
  for_count               INTEGER,
  against_count           INTEGER,
  abstain_count           INTEGER,
  present_not_voted_count INTEGER,
  raw_row                 JSONB,

  UNIQUE (vote_id, group_name)
);

CREATE TABLE IF NOT EXISTS public.parliament_vote_ballots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id         UUID NOT NULL REFERENCES public.parliament_votes(id) ON DELETE CASCADE,
  politician_id   UUID REFERENCES public.politicians(id) ON DELETE SET NULL,
  senator_id      TEXT, -- Senat ParlamentarID (GUID) for debug/mapping
  last_name       TEXT,
  first_name      TEXT,
  group_name      TEXT,
  ballot          parliament_ballot NOT NULL DEFAULT 'unknown',
  vote_method     TEXT, -- e.g. 'vot electronic', 'vot cu tablete'
  raw_row         JSONB,
  source_url      TEXT,

  UNIQUE (vote_id, senator_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parliament_votes_date ON public.parliament_votes(vote_date DESC);
CREATE INDEX IF NOT EXISTS idx_parliament_votes_chamber ON public.parliament_votes(chamber);
CREATE INDEX IF NOT EXISTS idx_parliament_ballots_vote ON public.parliament_vote_ballots(vote_id);
CREATE INDEX IF NOT EXISTS idx_parliament_ballots_politician ON public.parliament_vote_ballots(politician_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_parliament_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_parliament_votes_updated_at ON public.parliament_votes;
CREATE TRIGGER trigger_parliament_votes_updated_at
BEFORE UPDATE ON public.parliament_votes
FOR EACH ROW EXECUTE FUNCTION update_parliament_votes_updated_at();

-- RLS
ALTER TABLE public.parliament_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliament_vote_group_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliament_vote_ballots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parliament_votes_public_read"
  ON public.parliament_votes FOR SELECT
  USING (true);

CREATE POLICY "parliament_votes_service_write"
  ON public.parliament_votes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "parliament_vote_group_totals_public_read"
  ON public.parliament_vote_group_totals FOR SELECT
  USING (true);

CREATE POLICY "parliament_vote_group_totals_service_write"
  ON public.parliament_vote_group_totals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "parliament_vote_ballots_public_read"
  ON public.parliament_vote_ballots FOR SELECT
  USING (true);

CREATE POLICY "parliament_vote_ballots_service_write"
  ON public.parliament_vote_ballots FOR ALL
  USING (auth.role() = 'service_role');

