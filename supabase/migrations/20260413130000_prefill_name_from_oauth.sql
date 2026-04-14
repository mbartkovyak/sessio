-- Update handle_new_user trigger to extract first/last name from OAuth metadata.
-- Google: raw_user_meta_data contains given_name, family_name
-- Apple: raw_user_meta_data contains name (full name string)
-- Email/password: no metadata, names stay NULL (filled during onboarding)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first TEXT;
  v_last TEXT;
  v_meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  -- Google OAuth: given_name / family_name
  v_first := v_meta ->> 'given_name';
  v_last := v_meta ->> 'family_name';

  -- Apple Sign In: full_name or name (Apple only sends name on first sign-in)
  IF v_first IS NULL THEN
    v_first := v_meta ->> 'first_name';
    v_last := v_meta ->> 'last_name';
  END IF;
  IF v_first IS NULL AND v_meta ->> 'name' IS NOT NULL THEN
    -- "name" is a full name string — split on first space
    v_first := split_part(v_meta ->> 'name', ' ', 1);
    v_last := nullif(substring(v_meta ->> 'name' from position(' ' in v_meta ->> 'name') + 1), '');
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, v_first, v_last);
  RETURN NEW;
END;
$$;

-- Also update ensure_my_profile to extract OAuth metadata for users created
-- before this migration (e.g. after account deletion + re-registration).
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_meta JSONB;
  v_first TEXT;
  v_last TEXT;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fast path: profile exists
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN RETURN v_profile; END IF;

  -- Profile missing — read from auth.users and create with OAuth name if available
  SELECT email, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_email, v_meta
  FROM auth.users WHERE id = v_uid;

  -- Google
  v_first := v_meta ->> 'given_name';
  v_last := v_meta ->> 'family_name';
  -- Apple
  IF v_first IS NULL THEN
    v_first := v_meta ->> 'first_name';
    v_last := v_meta ->> 'last_name';
  END IF;
  IF v_first IS NULL AND v_meta ->> 'name' IS NOT NULL THEN
    v_first := split_part(v_meta ->> 'name', ' ', 1);
    v_last := nullif(substring(v_meta ->> 'name' from position(' ' in v_meta ->> 'name') + 1), '');
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (v_uid, COALESCE(v_email, ''), v_first, v_last)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  RETURN v_profile;
END;
$$;
