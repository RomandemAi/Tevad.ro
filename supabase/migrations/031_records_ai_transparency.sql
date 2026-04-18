-- AI transparency (plain summary + ensemble explain + per-model votes)

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS plain_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_explain TEXT,
  ADD COLUMN IF NOT EXISTS ai_model_votes JSONB;

COMMENT ON COLUMN public.records.plain_summary IS 'Short Romanian plain-language verdict (max ~25 words)';
COMMENT ON COLUMN public.records.ai_explain IS 'Romanian transparency: sources, models, confidence — 3-5 sentences';
COMMENT ON COLUMN public.records.ai_model_votes IS 'JSON array: {label, modelId, verdict, confidence} per ensemble member';
