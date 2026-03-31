-- Auto-deduct abonament sessions for past sessions.
-- Called when coach views a past session. Processes all signed-up players
-- with active abonaments who haven't been deducted yet.
-- Skips no_show and declined attendees.

CREATE OR REPLACE FUNCTION public.auto_deduct_session(p_session_id UUID)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_school_id UUID;
  v_att RECORD;
  v_abonament_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Get school_id from session's training
  SELECT t.school_id INTO v_school_id
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id;

  IF v_school_id IS NULL THEN RETURN 0; END IF;

  -- Verify caller is school owner or approved coach
  IF NOT EXISTS (SELECT 1 FROM schools WHERE id = v_school_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM school_members WHERE school_id = v_school_id AND coach_id = auth.uid() AND status = 'approved')
  THEN RETURN 0; END IF;

  -- Process each signed-up attendee (confirmed or pending, NOT declined/no_show)
  FOR v_att IN
    SELECT sa.user_id
    FROM session_attendance sa
    WHERE sa.session_id = p_session_id
    AND sa.status IN ('confirmed', 'pending')
  LOOP
    -- Find oldest active abonament for this player in this school
    SELECT pa.id, pa.sessions_remaining
    INTO v_abonament_id, v_remaining
    FROM player_abonaments pa
    WHERE pa.school_id = v_school_id
    AND pa.player_id = v_att.user_id
    AND pa.status = 'active'
    AND (pa.expires_at IS NULL OR pa.expires_at >= now())
    AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
    ORDER BY pa.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_abonament_id IS NOT NULL THEN
      -- Skip if already deducted for this session
      IF NOT EXISTS (
        SELECT 1 FROM abonament_usage
        WHERE player_abonament_id = v_abonament_id AND session_id = p_session_id
      ) THEN
        INSERT INTO abonament_usage (player_abonament_id, session_id)
        VALUES (v_abonament_id, p_session_id);

        IF v_remaining IS NOT NULL THEN
          UPDATE player_abonaments
          SET sessions_remaining = v_remaining - 1,
              status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
          WHERE id = v_abonament_id;
        END IF;

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
