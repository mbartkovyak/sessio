-- Fix: remove explicit full_name assignment from create_placeholder_athlete.
-- full_name is now a GENERATED ALWAYS column, so setting it explicitly errors with
-- "column full_name can only be updated to DEFAULT".

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('coach', 'school_owner')
  ) THEN
    RAISE EXCEPTION 'Only coaches and school owners can create placeholder athletes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM schools WHERE id = p_school_id AND owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM school_members WHERE school_id = p_school_id AND coach_id = auth.uid() AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Not authorized for this school';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change_confirm_status, is_sso_user
  ) VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_placeholder_email, '', now(), now(),
    '{"provider":"placeholder","providers":["placeholder"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    '', 0, false
  );

  UPDATE profiles SET
    first_name = p_first_name,
    last_name = p_last_name,
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, v_placeholder_email),
    is_placeholder = true,
    role = 'player',
    school_id = p_school_id
  WHERE id = v_id;

  RETURN v_id;
END;
$$;
