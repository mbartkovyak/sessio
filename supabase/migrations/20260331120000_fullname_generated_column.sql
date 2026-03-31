-- Make full_name a generated column derived from first_name + last_name.
-- This ensures full_name is always consistent and never stale.

-- Drop the manual column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- Recreate as a generated (computed) column
ALTER TABLE public.profiles ADD COLUMN full_name TEXT
  GENERATED ALWAYS AS (trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED;
