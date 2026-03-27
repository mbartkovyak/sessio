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

-- Update delete_my_account to also clear first_name and last_name
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM public.training_messages WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_open_spots WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.session_attendance WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  DELETE FROM public.training_sessions WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_members WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.join_requests WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.trainings WHERE coach_id = v_uid;

  DELETE FROM public.session_attendance WHERE user_id = v_uid;
  DELETE FROM public.training_members WHERE user_id = v_uid;
  DELETE FROM public.join_requests WHERE user_id = v_uid;
  DELETE FROM public.training_open_spots WHERE claimed_by = v_uid;
  DELETE FROM public.reviews WHERE reviewer_id = v_uid OR coach_id = v_uid;
  DELETE FROM public.training_messages WHERE sender_id = v_uid;

  DELETE FROM public.school_members WHERE coach_id = v_uid;
  DELETE FROM public.schools WHERE owner_id = v_uid;

  UPDATE public.profiles
  SET role = NULL, onboarding_complete = false, sport = NULL, city = NULL, bio = NULL,
      school_id = NULL, full_name = NULL, first_name = NULL, last_name = NULL,
      phone = NULL, avatar_url = NULL
  WHERE id = v_uid;
END;
$$;
