-- Deactivate gov.ro scrape artifacts (non-person rows) and duplicate premier Bolojan profiles.

UPDATE public.politicians
SET is_active = false
WHERE is_active = true
  AND (
    name ILIKE '%galerie%'
    OR name ILIKE '%cabinetul%'
    OR (chamber = 'premier' AND (name ILIKE '%miniștri%' OR name ILIKE '%ministri%'))
  );

-- Reassign records from duplicate premier Bolojan rows → canonical keeper, then deactivate dupes.
WITH candidates AS (
  SELECT
    p.id,
    p.name,
    (SELECT COUNT(*)::int FROM public.records r WHERE r.politician_id = p.id) AS rec_count
  FROM public.politicians p
  WHERE p.is_active = true
    AND p.chamber = 'premier'
    AND (p.slug ILIKE '%bolojan%' OR p.name ILIKE '%bolojan%')
),
ranked AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY
        CASE
          WHEN name ILIKE 'Ilie %' OR name ILIKE 'Ilie-%' THEN 0
          ELSE 1
        END,
        rec_count DESC,
        length(name)
    ) AS rn
  FROM candidates
),
keeper AS (SELECT id FROM ranked WHERE rn = 1),
victims AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE public.records AS r
SET politician_id = (SELECT id FROM keeper)
WHERE r.politician_id IN (SELECT id FROM victims);

WITH candidates AS (
  SELECT
    p.id,
    p.name,
    (SELECT COUNT(*)::int FROM public.records r WHERE r.politician_id = p.id) AS rec_count
  FROM public.politicians p
  WHERE p.is_active = true
    AND p.chamber = 'premier'
    AND (p.slug ILIKE '%bolojan%' OR p.name ILIKE '%bolojan%')
),
ranked AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY
        CASE
          WHEN name ILIKE 'Ilie %' OR name ILIKE 'Ilie-%' THEN 0
          ELSE 1
        END,
        rec_count DESC,
        length(name)
    ) AS rn
  FROM candidates
),
victims AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE public.politicians
SET is_active = false
WHERE id IN (SELECT id FROM victims);
