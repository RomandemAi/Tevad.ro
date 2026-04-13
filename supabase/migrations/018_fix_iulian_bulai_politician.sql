-- Fix mistaken "Alfred(o) Bulai" rows: USR deputy in Parliament is Iulian Bulai (not sociologist Alfred Bulai / Alfredo).
-- If a canonical Iulian Bulai deputy row already exists, re-point records and deactivate the duplicate.

-- 1) Move records from wrong row → canonical Iulian Bulai (deputat, active, name/slug looks correct)
UPDATE public.records AS r
SET politician_id = c.id
FROM public.politicians AS w
CROSS JOIN LATERAL (
  SELECT p.id
  FROM public.politicians p
  WHERE p.is_active = true
    AND p.chamber = 'deputat'
    AND (
      p.name ILIKE 'iulian%bulai%'
      OR (p.slug ILIKE '%iulian%' AND p.slug ILIKE '%bulai%')
    )
    AND p.name NOT ILIKE '%alfred%'
    AND p.name NOT ILIKE '%alfredo%'
    AND p.id <> w.id
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 1
) AS c
WHERE r.politician_id = w.id
  AND w.is_active = true
  AND w.chamber = 'deputat'
  AND (
    (w.name ILIKE '%bulai%' AND (w.name ILIKE '%alfred%' OR w.name ILIKE '%alfredo%'))
    OR (
      w.slug ILIKE '%bulai%'
      AND (w.slug ILIKE '%alfred%' OR w.slug ILIKE '%alfredo%')
    )
  );

-- 2) Deactivate wrong duplicate when canonical exists (same match as above)
UPDATE public.politicians AS w
SET is_active = false,
    updated_at = NOW()
WHERE w.is_active = true
  AND w.chamber = 'deputat'
  AND (
    (w.name ILIKE '%bulai%' AND (w.name ILIKE '%alfred%' OR w.name ILIKE '%alfredo%'))
    OR (
      w.slug ILIKE '%bulai%'
      AND (w.slug ILIKE '%alfred%' OR w.slug ILIKE '%alfredo%')
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.politicians p
    WHERE p.is_active = true
      AND p.chamber = 'deputat'
      AND p.id <> w.id
      AND (
        p.name ILIKE 'iulian%bulai%'
        OR (p.slug ILIKE '%iulian%' AND p.slug ILIKE '%bulai%')
      )
      AND p.name NOT ILIKE '%alfred%'
      AND p.name NOT ILIKE '%alfredo%'
  );

-- 3) No canonical row: rename wrong row in place (avoid slug collision)
UPDATE public.politicians AS w
SET
  name = 'Iulian Bulai',
  slug = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.politicians o
      WHERE o.slug = 'iulian-bulai'
        AND o.id <> w.id
    )
    THEN 'iulian-bulai-' || SUBSTRING(REPLACE(w.id::text, '-', ''), 1, 8)
    ELSE 'iulian-bulai'
  END,
  updated_at = NOW()
WHERE w.is_active = true
  AND w.chamber = 'deputat'
  AND (
    (w.name ILIKE '%bulai%' AND (w.name ILIKE '%alfred%' OR w.name ILIKE '%alfredo%'))
    OR (
      w.slug ILIKE '%bulai%'
      AND (w.slug ILIKE '%alfred%' OR w.slug ILIKE '%alfredo%')
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.politicians p
    WHERE p.is_active = true
      AND p.chamber = 'deputat'
      AND p.id <> w.id
      AND (
        p.name ILIKE 'iulian%bulai%'
        OR (p.slug ILIKE '%iulian%' AND p.slug ILIKE '%bulai%')
      )
      AND p.name NOT ILIKE '%alfred%'
      AND p.name NOT ILIKE '%alfredo%'
  );
