-- Add drop-in policy to trainings: controls whether players can join single sessions
-- 'allowed' = drop-ins welcome anytime (default, backwards compatible)
-- 'trial'   = one trial session, then must join the series
-- 'none'    = series commitment only

ALTER TABLE trainings ADD COLUMN drop_in_policy text NOT NULL DEFAULT 'allowed'
  CHECK (drop_in_policy IN ('allowed', 'trial', 'none'));

-- Update join_single_session RPC to enforce the policy
CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_training_id UUID;
  v_max_players INTEGER;
  v_drop_in_policy TEXT;
  v_confirmed INTEGER;
  v_prior_sessions INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get training info from the session
  SELECT t.id, t.max_players, t.drop_in_policy
    INTO v_training_id, v_max_players, v_drop_in_policy
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
    AND ts.status = 'scheduled'
    AND t.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or cancelled';
  END IF;

  -- Enforce drop-in policy
  IF v_drop_in_policy = 'none' THEN
    RAISE EXCEPTION 'Drop-ins not allowed';
  END IF;

  IF v_drop_in_policy = 'trial' THEN
    -- Count prior confirmed/no_show attendance in this training's sessions
    SELECT count(*) INTO v_prior_sessions
    FROM session_attendance sa
    JOIN training_sessions ts ON ts.id = sa.session_id
    WHERE ts.training_id = v_training_id
      AND sa.user_id = v_user_id
      AND sa.status IN ('confirmed', 'no_show');

    IF v_prior_sessions > 0 THEN
      RAISE EXCEPTION 'Trial session already used';
    END IF;
  END IF;

  -- Capacity check
  IF v_max_players IS NOT NULL THEN
    SELECT count(*) INTO v_confirmed
    FROM session_attendance
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_max_players THEN
      RAISE EXCEPTION 'Session is full';
    END IF;
  END IF;

  -- Insert attendance (unique constraint prevents duplicates)
  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (p_session_id, v_user_id, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$;
