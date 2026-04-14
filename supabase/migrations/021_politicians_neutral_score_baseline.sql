-- Politicians with no records (and any NULL score columns) should show the neutral 50% baseline
-- (matches SCORING.md empty-state and apps/web lib/displayScore).

UPDATE public.politicians p
SET
  score = 50,
  score_promises = 50,
  score_reactions = 50,
  score_sources = 50,
  score_consistency = 50
WHERE NOT EXISTS (SELECT 1 FROM public.records r WHERE r.politician_id = p.id);

UPDATE public.politicians
SET
  score = COALESCE(score, 50),
  score_promises = COALESCE(score_promises, 50),
  score_reactions = COALESCE(score_reactions, 50),
  score_sources = COALESCE(score_sources, 50),
  score_consistency = COALESCE(score_consistency, 50)
WHERE score IS NULL
   OR score_promises IS NULL
   OR score_reactions IS NULL
   OR score_sources IS NULL
   OR score_consistency IS NULL;
