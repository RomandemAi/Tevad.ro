-- Official portrait URL (e.g. gov.ro cabinet photos). When null, UI uses initials + avatar_color.
ALTER TABLE public.politicians
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.politicians.avatar_url IS 'HTTPS URL to official portrait; e.g. gov.ro/fisiere/ministri/…';
