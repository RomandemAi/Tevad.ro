-- Migration 017: cron_state key-value store for lightweight cron rotation

CREATE TABLE IF NOT EXISTS public.cron_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cron_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_state_service_rw"
  ON public.cron_state FOR ALL
  USING (auth.role() = 'service_role');

