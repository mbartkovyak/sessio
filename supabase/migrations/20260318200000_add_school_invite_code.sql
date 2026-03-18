ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- Backfill existing schools
UPDATE public.schools SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)) WHERE invite_code IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.schools ALTER COLUMN invite_code SET NOT NULL;
