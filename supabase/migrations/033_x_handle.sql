ALTER TABLE public.politicians
  ADD COLUMN IF NOT EXISTS x_handle TEXT;

COMMENT ON COLUMN public.politicians.x_handle IS 'X (Twitter) handle without @, e.g. ''CatalinDrula''';
