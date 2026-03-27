-- Add first_name and last_name columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing full_name data
UPDATE public.profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE ''
  END
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Trigger to keep full_name in sync with first_name + last_name
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only sync if first_name or last_name was explicitly set
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_full_name ON public.profiles;
CREATE TRIGGER trg_sync_full_name
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_full_name();

-- NOTE: delete_my_account is updated in 20260327180000_fix_delete_account_rpc.sql
-- The version below was broken (referenced dropped training_messages table).
-- Keeping this comment so the migration history is clear.
