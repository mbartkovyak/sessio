-- Placeholder athletes: coach-managed roster entries for people who haven't joined the app.
-- They get real auth.users entries (so all existing FKs, triggers, and RPCs work unchanged)
-- but are flagged with is_placeholder = true on profiles.

-- 1. Add is_placeholder flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;

-- 2. RPC to create a placeholder athlete
--    Creates a minimal auth.users entry + updates the auto-created profile.
--    Returns the new placeholder's UUID.
CREATE OR REPLACE FUNCTION public.create_placeholder_athlete(
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_placeholder_email TEXT := 'placeholder-' || v_id || '@sessio.internal';
  v_full_name TEXT := TRIM(CONCAT(p_first_name, ' ', p_last_name));
BEGIN
  -- Only coaches and school owners can create placeholders
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('coach', 'school_owner')
  ) THEN
    RAISE EXCEPTION 'Only coaches and school owners can create placeholder athletes';
  END IF;

  -- Verify caller belongs to this school
  IF NOT EXISTS (
    SELECT 1 FROM schools WHERE id = p_school_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM school_members WHERE school_id = p_school_id AND coach_id = auth.uid() AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Not authorized for this school';
  END IF;

  -- Create minimal auth entry (no password, no email confirmation → can never log in)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change_confirm_status, is_sso_user
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_placeholder_email,
    '',  -- empty password hash → can never log in with password
    now(), now(),
    '{"provider":"placeholder","providers":["placeholder"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    '', 0, false
  );

  -- handle_new_user trigger auto-creates a profile row with (id, email).
  -- Update it with the real details.
  UPDATE profiles SET
    first_name = p_first_name,
    last_name = p_last_name,
    full_name = v_full_name,
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, v_placeholder_email),
    is_placeholder = true,
    role = 'player',
    school_id = p_school_id
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- 3. RPC to merge a placeholder into a real user account (for when they eventually join)
CREATE OR REPLACE FUNCTION public.merge_placeholder_into_user(
  p_placeholder_id UUID,
  p_real_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only coaches/owners can merge
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('coach', 'school_owner')
  ) THEN
    RAISE EXCEPTION 'Only coaches and school owners can merge placeholder athletes';
  END IF;

  -- Verify the placeholder exists and is actually a placeholder
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_placeholder_id AND is_placeholder = true
  ) THEN
    RAISE EXCEPTION 'Placeholder not found';
  END IF;

  -- Transfer all training memberships
  UPDATE training_members SET user_id = p_real_user_id
  WHERE user_id = p_placeholder_id
  AND NOT EXISTS (
    SELECT 1 FROM training_members tm2
    WHERE tm2.training_id = training_members.training_id AND tm2.user_id = p_real_user_id
  );
  -- Delete any remaining duplicates
  DELETE FROM training_members WHERE user_id = p_placeholder_id;

  -- Transfer attendance records
  UPDATE session_attendance SET user_id = p_real_user_id
  WHERE user_id = p_placeholder_id
  AND NOT EXISTS (
    SELECT 1 FROM session_attendance sa2
    WHERE sa2.session_id = session_attendance.session_id AND sa2.user_id = p_real_user_id
  );
  DELETE FROM session_attendance WHERE user_id = p_placeholder_id;

  -- Transfer passes
  UPDATE player_abonaments SET player_id = p_real_user_id
  WHERE player_id = p_placeholder_id;

  -- Transfer abonament usage (via pass FK, but just in case)
  -- Usage records reference player_abonaments, which we already transferred.

  -- Delete the placeholder profile + auth entry
  DELETE FROM auth.users WHERE id = p_placeholder_id;
  -- profiles row cascades from auth.users deletion
END;
$$;

-- 4. Exclude placeholders from public coach discovery search
--    The existing "Coach profiles discoverable" policy already filters by role = 'coach',
--    so placeholders (role = 'player') won't appear there.
--    But add an explicit filter for safety on the training-participant visibility policies.
--    (No changes needed — existing policies already work correctly since they're scoped
--     to training members, which is coach-controlled.)
