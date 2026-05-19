-- join_single_session now returns the resulting attendance status ('confirmed'
-- or 'pending') so the invite-link UI can route waitlisters to the right
-- success state instead of showing the "Confirmed!" screen for everyone.
--
-- Body identical to the v2 in 20260507180000_session_capacity_in_public_rpcs_plus_waitlist.sql
-- per CLAUDE.md "copy current body" rule, only the return type and the trailing
-- RETURN have been added.

DROP FUNCTION IF EXISTS public.join_single_session(uuid);

CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_players INTEGER;
  v_allow_waitlist BOOLEAN;
  v_confirmed INTEGER;
  v_required_pass_type_id UUID;
  v_session_date DATE;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the training row to serialize concurrent joins on the same session.
  SELECT t.max_players, t.allow_waitlist, t.required_pass_type_id, ts.session_date
    INTO v_max_players, v_allow_waitlist, v_required_pass_type_id, v_session_date
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
    AND ts.status = 'scheduled'
    AND t.is_active = true
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or cancelled';
  END IF;

  IF v_required_pass_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM player_abonaments pa
      WHERE pa.player_id = v_user_id
        AND pa.abonament_type_id = v_required_pass_type_id
        AND pa.status = 'active'
        AND pa.activated_at::date <= v_session_date
        AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_session_date)
        AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
    ) THEN
      RAISE EXCEPTION 'PASS_REQUIRED';
    END IF;
  END IF;

  v_status := 'confirmed';

  IF v_max_players IS NOT NULL THEN
    SELECT count(*) INTO v_confirmed
    FROM session_attendance
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_max_players THEN
      -- Full → waitlist if training allows it, otherwise reject.
      IF NOT COALESCE(v_allow_waitlist, false) THEN
        RAISE EXCEPTION 'Session is full';
      END IF;
      v_status := 'pending';
    END IF;
  END IF;

  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (
    p_session_id,
    v_user_id,
    v_status,
    CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END
  )
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_single_session(UUID) TO authenticated;
ALTER FUNCTION public.join_single_session(UUID) SET statement_timeout = '15s';
