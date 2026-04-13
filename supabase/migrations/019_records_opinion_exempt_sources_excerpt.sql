-- Opinion / UI flags, source excerpts, data fixes (Magyar queue record, Ciucă taxes, Mureșan opinion)

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS opinion_exempt BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.records.opinion_exempt IS 'Political opinion / non-falsifiable — UI explains verdict does not apply.';

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS excerpt TEXT;

COMMENT ON COLUMN public.sources.excerpt IS 'Short text excerpt passed to blind verification models.';

-- 1) Remove mistaken non-RO politician row (from verification_queue pipeline)
DELETE FROM public.records
WHERE slug = 'vq-3b01c6db-4971-46e5-ba5a-98cd70244b42';

-- 2) Ciucă — tax promise: reset for re-verification + tier-0 context + Newsweek evidence
UPDATE public.records r
SET
  type = 'promise',
  status = 'pending',
  ai_verdict = NULL,
  ai_confidence = NULL,
  ai_reasoning = NULL,
  ai_model = NULL,
  ai_verified_at = NULL,
  date_verified = NULL,
  opinion_exempt = FALSE
FROM public.politicians p
WHERE r.politician_id = p.id
  AND r.text ILIKE '%Nu vom crește taxele%'
  AND (p.name ILIKE '%Ciucă%' OR p.slug ILIKE '%ciuca%');

INSERT INTO public.sources (record_id, tier, outlet, url, title, excerpt, published_at)
SELECT r.id,
  '0',
  'Guvernul României',
  'https://www.gov.ro/',
  'Context oficial — legislație și politici fiscale',
  'Sursă oficială de context procedural pentru interpretarea declarațiilor publice despre taxe, impozite și buget.',
  '2024-01-01'
FROM public.records r
JOIN public.politicians p ON p.id = r.politician_id
WHERE r.text ILIKE '%Nu vom crește taxele%'
  AND (p.name ILIKE '%Ciucă%' OR p.slug ILIKE '%ciuca%')
  AND NOT EXISTS (
    SELECT 1 FROM public.sources s
    WHERE s.record_id = r.id AND s.url = 'https://www.gov.ro/'
  );

INSERT INTO public.sources (record_id, tier, outlet, url, title, excerpt, published_at)
SELECT r.id,
  '1',
  'Newsweek România',
  'https://newsweek.ro/politica/ciuca-confirma-ca-in-coalitie-se-discuta-mariri-de-taxe-si-impozite-in-2024-este-absolut-incorect',
  'Ciucă confirmă că în coaliție se discută măriri de taxe',
  'Nicolae Ciucă confirmă că în coaliția de guvernare există discuții despre măriri de taxe și impozite. Declarația contrazice asigurările anterioare că nu se vor majora taxele; context: negocieri bugetare 2024.',
  '2024-06-01'
FROM public.records r
JOIN public.politicians p ON p.id = r.politician_id
WHERE r.text ILIKE '%Nu vom crește taxele%'
  AND (p.name ILIKE '%Ciucă%' OR p.slug ILIKE '%ciuca%')
  AND NOT EXISTS (
    SELECT 1 FROM public.sources s
    WHERE s.record_id = r.id
      AND s.url LIKE '%newsweek.ro%ciuca-confirma-ca-in-coalitie%'
  );

-- 3) Mureșan — Putin statement treated as political opinion (not fact-checkable)
UPDATE public.records r
SET
  type = 'statement',
  opinion_exempt = TRUE,
  status = 'pending',
  ai_verdict = NULL,
  ai_confidence = NULL,
  ai_reasoning = NULL,
  ai_model = NULL,
  ai_verified_at = NULL,
  date_verified = NULL
FROM public.politicians p
WHERE r.politician_id = p.id
  AND p.name ILIKE '%Mureșan%'
  AND r.text ILIKE '%Putin%';
