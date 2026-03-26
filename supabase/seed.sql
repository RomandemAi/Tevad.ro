-- seed.sql — Development seed data
-- Tevad.ro · Te Văd · Romania Political Accountability
-- DO NOT RUN IN PRODUCTION

INSERT INTO public.politicians
  (slug, name, role, party, party_short, chamber, score, score_promises, score_reactions, score_sources, score_consistency, avatar_color, avatar_text_color)
VALUES
  ('nicolae-ciuca',   'Nicolae Ciucă',   'Senator · Fost Prim-ministru', 'Partidul Național Liberal', 'PNL', 'senator',  54, 45, 58, 62, 50, '#0d2a4a', '#378ADD'),
  ('marcel-ciolacu',  'Marcel Ciolacu',  'Prim-ministru',                'Partidul Social Democrat',  'PSD', 'premier',  41, 30, 42, 55, 38, '#2a0d1e', '#f04545'),
  ('catalin-tenita',  'Cătălin Teniță',  'Deputat',                      'Uniunea Salvați România',   'USR', 'deputat',  78, 80, 75, 82, 74, '#0d2a1a', '#22c97a'),
  ('george-simion',   'George Simion',   'Deputat · Președinte AUR',     'Alianța pentru Unirea Românilor', 'AUR', 'deputat', 29, 18, 35, 22, 40, '#2a1e0d', '#f5a623'),
  ('elena-lasconi',   'Elena Lasconi',   'Deputat',                      'Uniunea Salvați România',   'USR', 'deputat',  71, 75, 68, 74, 67, '#1e0d2a', '#a78bfa');

-- Seed records for Nicolae Ciucă
INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'ciuca-autostrazi-2024', 'promise',
  'Voi construi 1000 km de autostradă până în 2024.',
  'infrastructure', 'false', '2021-10-15', 'high', 94
FROM public.politicians WHERE slug = 'nicolae-ciuca';

INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'ciuca-no-tax-increase', 'statement',
  'Nu vom crește taxele în această perioadă de guvernare.',
  'taxes', 'false', '2022-01-10', 'high', 91
FROM public.politicians WHERE slug = 'nicolae-ciuca';

-- Seed records for Marcel Ciolacu
INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'ciolacu-pensii-speciale', 'promise',
  'Vom elimina pensiile speciale — promisiune electorală cheie.',
  'pensions', 'false', '2020-09-01', 'high', 97
FROM public.politicians WHERE slug = 'marcel-ciolacu';

INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'ciolacu-deficit-3-procente', 'promise',
  'Deficitul bugetar va fi sub 3% în 2024.',
  'economy', 'false', '2024-01-15', 'high', 96
FROM public.politicians WHERE slug = 'marcel-ciolacu';

-- Seed records for Cătălin Teniță
INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'tenita-cheltuieli-birou', 'promise',
  'Voi publica toate cheltuielile biroului parlamentar lunar.',
  'transparency', 'true', '2020-12-10', 'medium', 99
FROM public.politicians WHERE slug = 'catalin-tenita';

-- Seed records for George Simion
INSERT INTO public.records (politician_id, slug, type, text, topic, status, date_made, impact_level, ai_confidence)
SELECT id, 'simion-nu-coalitie-psd-pnl', 'promise',
  'AUR nu va intra niciodată la guvernare cu PSD sau PNL.',
  'coalition', 'false', '2020-12-05', 'high', 98
FROM public.politicians WHERE slug = 'george-simion';

-- Seed sources
INSERT INTO public.sources (record_id, tier, outlet, url, archived_url, published_at)
SELECT r.id, '1', 'Digi24',
  'https://www.digi24.ro/stiri/actualitate/politica/ciuca-autostrazi',
  'https://web.archive.org/web/2021/https://www.digi24.ro/stiri/actualitate/politica/ciuca-autostrazi',
  '2021-10-15'
FROM public.records r WHERE r.slug = 'ciuca-autostrazi-2024';

INSERT INTO public.sources (record_id, tier, outlet, url, archived_url, published_at)
SELECT r.id, '1', 'HotNews',
  'https://www.hotnews.ro/stiri-politic/ciuca-autostrazi-verificare',
  'https://web.archive.org/web/2024/https://www.hotnews.ro/stiri-politic/ciuca-autostrazi-verificare',
  '2024-01-10'
FROM public.records r WHERE r.slug = 'ciuca-autostrazi-2024';
