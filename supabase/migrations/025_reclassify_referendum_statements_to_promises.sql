-- Reclassify forward-commitment lines stored as statements (e.g. referendum pledges).
-- Heuristic aligned with packages/rss-monitor/src/resolve-record-type.ts

UPDATE public.records
SET type = 'promise'
WHERE type = 'statement'
  AND COALESCE(opinion_exempt, false) = false
  AND (
    text ~* '(vom|voi|vă vom|ne vom).{0,120}(referendum|referendu)'
    OR text ~* '(referendum|referendu).{0,120}(vom|voi|organiza|convoca|face)'
  );
