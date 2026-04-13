-- Allow both canonical 'minister' and legacy 'ministru' in chamber CHECK (some DBs diverged)
ALTER TABLE public.politicians DROP CONSTRAINT IF EXISTS politicians_chamber_check;
ALTER TABLE public.politicians ADD CONSTRAINT politicians_chamber_check
  CHECK (
    chamber IN (
      'deputat',
      'senator',
      'premier',
      'president',
      'minister',
      'ministru',
      'other'
    )
  );
