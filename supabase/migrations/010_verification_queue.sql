-- RSS / classifier pipeline: queue rows for AI verification (no record yet)

CREATE TABLE IF NOT EXISTS public.verification_queue (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  politician_id     UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
  article_url       TEXT NOT NULL,
  article_title     TEXT NOT NULL,
  outlet            TEXT NOT NULL,
  tier              SMALLINT,
  record_type       TEXT,
  topic             TEXT,
  extracted_quote   TEXT,
  confidence        INTEGER,
  pub_date          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_queue_article_url
  ON public.verification_queue (article_url);

CREATE INDEX IF NOT EXISTS idx_verification_queue_politician
  ON public.verification_queue (politician_id);

CREATE INDEX IF NOT EXISTS idx_verification_queue_created
  ON public.verification_queue (created_at DESC);

ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_queue_public_read"
  ON public.verification_queue FOR SELECT USING (true);

CREATE POLICY "verification_queue_service_write"
  ON public.verification_queue FOR ALL USING (auth.role() = 'service_role');
