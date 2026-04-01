-- Fix: after the 2026-03-27 prod wipe, auth.users rows survived but profiles
-- rows were deleted. Existing users who log in don't trigger on_auth_user_created
-- (it's an INSERT trigger), so they have no profile row → login redirect loop.
--
-- This SECURITY DEFINER RPC reads the user's email from auth.users and creates
-- the profile row if missing. Called from fetchProfile on PGRST116 (0 rows).

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fast path: profile exists
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN RETURN v_profile; END IF;

  -- Profile missing — read email from auth.users and create it
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.profiles (id, email)
  VALUES (v_uid, COALESCE(v_email, ''))
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  RETURN v_profile;
END;
$$;
