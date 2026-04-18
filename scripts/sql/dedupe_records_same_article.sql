-- =============================================================================
-- Dedupe `records` rows that share the same article URL for one politician.
-- Keeps the "best" row (highest ai_confidence, then strongest verdict, then newest).
-- Child rows (sources, reactions, verdict_audit_logs, …) CASCADE with record delete.
--
-- Run in Supabase SQL Editor (or psql) as a user with DELETE on public.records.
--
-- 1) Run the PREVIEW only (section A) and inspect `victim_count` / sample rows.
-- 2) If OK, run section B inside a transaction (BEGIN … COMMIT).
-- 3) Re-run score recalc for affected politicians if your pipeline does not auto-sync.
-- =============================================================================

-- A) URL key (aligned with apps/web lib + rss-monitor article-dedupe: strip #, whole
--    query string, trailing slashes, lowercase, https, drop leading www.)
CREATE OR REPLACE FUNCTION public.tsvad_article_url_key(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT nullif(
    trim(
      both '/'
      FROM regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(split_part(split_part(trim(COALESCE(raw, '')), '#', 1), '?', 1)),
            '^http://',
            'https://'
          ),
          '^https://www\.',
          'https://'
        ),
        '^http://www\.',
        'https://'
      )
    ),
    ''
  );
$f$;

COMMENT ON FUNCTION public.tsvad_article_url_key(text) IS
  'Stable key for “same article” dedupe. Drops query string (aggressive). Used by cleanup script only.';

-- -----------------------------------------------------------------------------
-- PREVIEW: how many rows would be removed, and sample victims vs keepers
-- -----------------------------------------------------------------------------
WITH primary_url AS (
  SELECT
    r.id AS record_id,
    r.politician_id,
    r.slug,
    r.status::text AS status,
    r.ai_confidence,
    r.created_at,
    COALESCE(
      (
        SELECT s.url
        FROM public.sources s
        WHERE s.record_id = r.id
          AND s.tier IN ('1', '2')
        ORDER BY s.id
        LIMIT 1
      ),
      (
        SELECT s.url
        FROM public.sources s
        WHERE s.record_id = r.id
        ORDER BY s.id
        LIMIT 1
      )
    ) AS article_url
  FROM public.records r
),
with_key AS (
  SELECT
    p.*,
    public.tsvad_article_url_key(p.article_url) AS url_key
  FROM primary_url p
  WHERE p.article_url IS NOT NULL
    AND length(trim(p.article_url)) > 0
    AND public.tsvad_article_url_key(p.article_url) <> ''
),
ranked AS (
  SELECT
    w.*,
    row_number() OVER (
      PARTITION BY w.politician_id, w.url_key
      ORDER BY
        COALESCE(w.ai_confidence, -1) DESC,
        CASE w.status
          WHEN 'true' THEN 4
          WHEN 'partial' THEN 3
          WHEN 'false' THEN 2
          ELSE 1
        END DESC,
        w.created_at DESC NULLS LAST,
        w.record_id
    ) AS rn
  FROM with_key w
)
SELECT
  (SELECT count(*)::bigint FROM ranked WHERE rn > 1) AS victim_rows_to_delete,
  pol.slug AS politician_slug,
  pol.name AS politician_name,
  r.url_key,
  r.record_id AS would_delete_record_id,
  r.slug AS would_delete_slug,
  r.status AS victim_status,
  r.ai_confidence AS victim_confidence,
  k.record_id AS keeper_record_id,
  k.slug AS keeper_slug,
  k.status AS keeper_status,
  k.ai_confidence AS keeper_confidence
FROM ranked r
JOIN ranked k
  ON k.politician_id = r.politician_id
 AND k.url_key = r.url_key
 AND k.rn = 1
JOIN public.politicians pol ON pol.id = r.politician_id
WHERE r.rn > 1
ORDER BY pol.slug, r.url_key
LIMIT 200;


-- =============================================================================
-- B) APPLY DELETE — copy everything from BEGIN through COMMIT into the editor
--    after the preview (section A) looks correct.
-- =============================================================================
/*
BEGIN;

WITH primary_url AS (
  SELECT
    r.id AS record_id,
    r.politician_id,
    r.slug,
    r.status::text AS status,
    r.ai_confidence,
    r.created_at,
    COALESCE(
      (
        SELECT s.url
        FROM public.sources s
        WHERE s.record_id = r.id
          AND s.tier IN ('1', '2')
        ORDER BY s.id
        LIMIT 1
      ),
      (
        SELECT s.url
        FROM public.sources s
        WHERE s.record_id = r.id
        ORDER BY s.id
        LIMIT 1
      )
    ) AS article_url
  FROM public.records r
),
with_key AS (
  SELECT
    p.*,
    public.tsvad_article_url_key(p.article_url) AS url_key
  FROM primary_url p
  WHERE p.article_url IS NOT NULL
    AND length(trim(p.article_url)) > 0
    AND public.tsvad_article_url_key(p.article_url) <> ''
),
ranked AS (
  SELECT
    w.*,
    row_number() OVER (
      PARTITION BY w.politician_id, w.url_key
      ORDER BY
        COALESCE(w.ai_confidence, -1) DESC,
        CASE w.status
          WHEN 'true' THEN 4
          WHEN 'partial' THEN 3
          WHEN 'false' THEN 2
          ELSE 1
        END DESC,
        w.created_at DESC NULLS LAST,
        w.record_id
    ) AS rn
  FROM with_key w
)
DELETE FROM public.records r
USING ranked x
WHERE r.id = x.record_id
  AND x.rn > 1;

COMMIT;
*/

-- Optional: drop helper after you no longer need previews
-- DROP FUNCTION IF EXISTS public.tsvad_article_url_key(text);
