-- join_training now returns enough info for the JoinTraining success screen
-- to tell the player which date they'll actually attend next, and how many
-- upcoming sessions are at capacity (got 'pending' from the smart-routing
-- trigger). Without this, the player sees "you're signed up" but their next
-- chronological session is hidden behind a 'pending' status — confusing.
--
-- Body copied from current state (20260505230000_capacity_safe_joins.sql)
-- and patched in-place per CLAUDE.md "copy current body, not stale" rule.

-- Return type changes from `text` to `jsonb`. Postgres CREATE OR REPLACE
-- cannot change return type of an existing function, so drop first.
DROP FUNCTION IF EXISTS public.join_training(UUID);

CREATE OR REPLACE FUNCTION public.join_training(p_training_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_players INTEGER;
  v_allow_waitlist BOOLEAN;
  v_booking_mode TEXT;
  v_is_active BOOLEAN;
  v_existing_role TEXT;
  v_count INTEGER;
  v_role TEXT;
  v_next_confirmed_date DATE;
  v_pending_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT max_players, allow_waitlist, booking_mode, is_active
    INTO v_max_players, v_allow_waitlist, v_booking_mode, v_is_active
  FROM trainings
  WHERE id = p_training_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_is_active THEN
    RAISE EXCEPTION 'Training not found';
  END IF;

  IF v_booking_mode = 'approval' THEN
    RAISE EXCEPTION 'APPROVAL_REQUIRED';
  END IF;

  SELECT role INTO v_existing_role
  FROM training_members
  WHERE training_id = p_training_id AND user_id = v_user_id;

  IF FOUND THEN
    v_role := v_existing_role;
  ELSE
    IF v_max_players IS NOT NULL THEN
      SELECT count(*) INTO v_count
      FROM training_members
      WHERE training_id = p_training_id AND role = 'regular';

      IF v_count >= v_max_players THEN
        IF NOT COALESCE(v_allow_waitlist, false) THEN
          RAISE EXCEPTION 'TRAINING_FULL';
        END IF;
        v_role := 'waitlist';
      ELSE
        v_role := 'regular';
      END IF;
    ELSE
      v_role := 'regular';
    END IF;

    INSERT INTO training_members (training_id, user_id, role)
    VALUES (p_training_id, v_user_id, v_role);
    -- create_attendance_for_new_member trigger fires here, smart-routing
    -- session_attendance rows to 'confirmed' or 'pending' per session capacity.
  END IF;

  -- Aggregate the user's per-session status across this training so the client
  -- can show what date they're actually confirmed for next.
  SELECT MIN(ts.session_date) INTO v_next_confirmed_date
  FROM session_attendance sa
  JOIN training_sessions ts ON ts.id = sa.session_id
  WHERE sa.user_id = v_user_id
    AND ts.training_id = p_training_id
    AND sa.status = 'confirmed'
    AND ts.session_date >= CURRENT_DATE
    AND ts.status = 'scheduled';

  SELECT count(*)::integer INTO v_pending_count
  FROM session_attendance sa
  JOIN training_sessions ts ON ts.id = sa.session_id
  WHERE sa.user_id = v_user_id
    AND ts.training_id = p_training_id
    AND sa.status = 'pending'
    AND ts.session_date >= CURRENT_DATE
    AND ts.status = 'scheduled';

  RETURN jsonb_build_object(
    'role', v_role,
    'next_confirmed_date', v_next_confirmed_date,
    'pending_count', COALESCE(v_pending_count, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_training(UUID) TO authenticated;
