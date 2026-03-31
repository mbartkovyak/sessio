-- When marking a pass holder as "Attended", also update their session_attendance
-- status to 'confirmed' so the attendance display stays in sync.

CREATE OR REPLACE FUNCTION public.deduct_abonament_session(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_school_id UUID;
  v_school_owner_id UUID;
  v_player_id UUID;
BEGIN
  SELECT pa.sessions_remaining, pa.expires_at, pa.school_id, s.owner_id, pa.player_id
  INTO v_remaining, v_expires_at, v_school_id, v_school_owner_id, v_player_id
  FROM player_abonaments pa
  JOIN schools s ON s.id = pa.school_id
  WHERE pa.id = p_player_abonament_id AND pa.status = 'active'
  FOR UPDATE OF pa;

  IF NOT FOUND THEN RAISE EXCEPTION 'Abonament not found or not active'; END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    UPDATE player_abonaments SET status = 'expired' WHERE id = p_player_abonament_id;
    RAISE EXCEPTION 'Abonament has expired';
  END IF;

  IF auth.uid() != v_school_owner_id
    AND NOT EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = v_school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF EXISTS (SELECT 1 FROM abonament_usage WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id) THEN
    RAISE EXCEPTION 'Already deducted for this session';
  END IF;

  IF v_remaining IS NOT NULL AND v_remaining <= 0 THEN RAISE EXCEPTION 'No sessions remaining'; END IF;

  INSERT INTO abonament_usage (player_abonament_id, session_id) VALUES (p_player_abonament_id, p_session_id);

  IF v_remaining IS NOT NULL THEN
    UPDATE player_abonaments SET sessions_remaining = sessions_remaining - 1 WHERE id = p_player_abonament_id;
  END IF;

  -- Also mark the player as present in session attendance
  UPDATE session_attendance
  SET status = 'confirmed'
  WHERE session_id = p_session_id AND user_id = v_player_id AND status != 'confirmed';
END;
$$;
