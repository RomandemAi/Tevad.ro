-- Daily reaction caps per politician (v1.3.0 Tank-Proof)
-- Used to dampen coordinated spikes (enforced by API layer / cron).

CREATE TABLE IF NOT EXISTS public.politician_daily_reaction_caps (
  politician_id   UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
  day             DATE NOT NULL,
  reactions_total INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (politician_id, day)
);

CREATE INDEX IF NOT EXISTS idx_politician_daily_reaction_caps_day
  ON public.politician_daily_reaction_caps(day DESC);

ALTER TABLE public.politician_daily_reaction_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "politician_daily_reaction_caps_public_read"
  ON public.politician_daily_reaction_caps FOR SELECT USING (true);

CREATE POLICY "politician_daily_reaction_caps_service_write"
  ON public.politician_daily_reaction_caps FOR ALL USING (auth.role() = 'service_role');

