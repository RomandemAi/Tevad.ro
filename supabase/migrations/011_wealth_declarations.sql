-- ANI / integritate.eu wealth declarations + politician transparency fields

ALTER TABLE public.politicians
  ADD COLUMN IF NOT EXISTS last_declaration_date DATE,
  ADD COLUMN IF NOT EXISTS declaration_stopped_after_ccr BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.wealth_declarations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id         UUID NOT NULL REFERENCES public.politicians(id) ON DELETE CASCADE,
  year                  INTEGER NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('avere', 'interese')),
  pdf_url               TEXT NOT NULL,
  archived_url          TEXT,
  institution           TEXT,
  declaration_date      DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (politician_id, pdf_url)
);

CREATE INDEX IF NOT EXISTS idx_wealth_politician ON public.wealth_declarations(politician_id);
CREATE INDEX IF NOT EXISTS idx_wealth_year ON public.wealth_declarations(year DESC);

ALTER TABLE public.wealth_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wealth_declarations_public_read" ON public.wealth_declarations;
CREATE POLICY "wealth_declarations_public_read"
  ON public.wealth_declarations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "wealth_declarations_service_write" ON public.wealth_declarations;
CREATE POLICY "wealth_declarations_service_write"
  ON public.wealth_declarations FOR ALL
  USING (auth.role() = 'service_role');
