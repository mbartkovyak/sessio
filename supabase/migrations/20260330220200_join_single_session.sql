-- RPC for one-off (drop-in) session signup — player joins a single session without joining the training series.
-- Uses SECURITY DEFINER for atomic capacity check + insert.

CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_players INTEGER;
  v_confirmed INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get capacity from the session's training
  SELECT t.max_players INTO v_max_players
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
    AND ts.status = 'scheduled'
    AND t.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or cancelled';
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
