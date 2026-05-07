-- Capacity-safe join paths.
-- Two SECURITY DEFINER RPCs that move capacity checks server-side and lock
-- the relevant rows so concurrent joins/adds can't push a class past max_players.
--
-- Replaces:
--   • Client-side count + insert in src/pages/shared/JoinTraining.tsx
--     (recurring sign-up — racy under simultaneous joins).
--   • Raw upsert into session_attendance in src/pages/coach/SessionDetail.tsx
--     "Add participant" flow (no capacity guard at all).

-- ── 1. join_training: atomic recurring sign-up ─────────────────────────
CREATE OR REPLACE FUNCTION public.join_training(p_training_id UUID)
RETURNS text
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the training row to serialize concurrent joins on the same training.
  SELECT max_players, allow_waitlist, booking_mode, is_active
    INTO v_max_players, v_allow_waitlist, v_booking_mode, v_is_active
  FROM trainings
  WHERE id = p_training_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_is_active THEN
    RAISE EXCEPTION 'Training not found';
  END IF;

  IF v_booking_mode = 'approval' THEN
    -- Approval flow goes through join_requests on the client, not this RPC.
    RAISE EXCEPTION 'APPROVAL_REQUIRED';
  END IF;

  SELECT role INTO v_existing_role
  FROM training_members
  WHERE training_id = p_training_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN v_existing_role;
  END IF;

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

  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_training(UUID) TO authenticated;

-- ── 2. coach_add_to_session: capacity-checked manual add ───────────────
CREATE OR REPLACE FUNCTION public.coach_add_to_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID;
  v_max_players INTEGER;
  v_confirmed INTEGER;
  v_authorised BOOLEAN;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller owns this session's training (coach or school owner).
  SELECT EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN trainings t ON t.id = ts.training_id
    WHERE ts.id = p_session_id
      AND (
        t.coach_id = v_caller
        OR EXISTS (
          SELECT 1 FROM schools s
          WHERE s.id = t.school_id AND s.owner_id = v_caller
        )
      )
  ) INTO v_authorised;

  IF NOT v_authorised THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  -- Lock the parent training row to serialize against concurrent joins.
  SELECT t.max_players INTO v_max_players
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
  FOR UPDATE OF t;

  -- Skip the capacity check if this user is already confirmed (idempotent re-add).
  IF v_max_players IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM session_attendance
    WHERE session_id = p_session_id
      AND user_id = p_user_id
      AND status = 'confirmed'
  ) THEN
    SELECT count(*) INTO v_confirmed
    FROM session_attendance
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_max_players THEN
      RAISE EXCEPTION 'SESSION_FULL';
    END IF;
  END IF;

  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (p_session_id, p_user_id, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO UPDATE
    SET status = 'confirmed',
        confirmed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_add_to_session(UUID, UUID) TO authenticated;
