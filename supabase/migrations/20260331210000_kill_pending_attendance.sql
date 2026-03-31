-- Kill 'pending' attendance status everywhere.
-- Auto-confirmed model: members are 'confirmed' by default, cancel if not coming.
-- There is no pending.

-- 1. Backfill ALL remaining pending attendance → confirmed (past AND future)
UPDATE public.session_attendance
SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, now())
WHERE status = 'pending';

-- 2. Change the default from 'pending' to 'confirmed'
ALTER TABLE public.session_attendance ALTER COLUMN status SET DEFAULT 'confirmed';

-- 3. Fix deduct_abonament_session: remove the silent status promotion.
--    Deduction should only record pass usage, not change attendance status.
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
END;
$$;

-- 4. Fix auto_deduct_session: only process confirmed attendees, not pending.
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
  SELECT t.school_id INTO v_school_id
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id;

  IF v_school_id IS NULL THEN RETURN 0; END IF;

  IF NOT EXISTS (SELECT 1 FROM schools WHERE id = v_school_id AND owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM school_members WHERE school_id = v_school_id AND coach_id = auth.uid() AND status = 'approved')
  THEN RETURN 0; END IF;

  -- Only process confirmed attendees (no pending — it doesn't exist anymore)
  FOR v_att IN
    SELECT sa.user_id
    FROM session_attendance sa
    WHERE sa.session_id = p_session_id
    AND sa.status = 'confirmed'
  LOOP
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
