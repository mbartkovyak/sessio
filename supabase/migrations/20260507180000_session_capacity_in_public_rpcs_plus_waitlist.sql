-- Two related changes for the public coach/school profile schedule:
--
-- 1. The public upcoming-sessions RPCs now return capacity info (max_players,
--    confirmed_count, allow_waitlist) so the UI can show "X/Y", "Full", or
--    a "Join waitlist" CTA without a second round-trip.
--
-- 2. join_single_session: when the session is at capacity AND the training
--    has allow_waitlist=true, insert the attendance row as 'pending' instead
--    of raising 'Session is full'. This is the per-session waitlist that
--    matches the existing recurring-join semantics (training_members.role
--    = 'waitlist' on the recurring path; session_attendance.status = 'pending'
--    on the per-session path).
--
-- Bodies copied from current state per CLAUDE.md "copy current body, not
-- stale" rule:
--   - get_coach_upcoming_sessions / get_school_upcoming_sessions from
--     20260507170000_extend_public_upcoming_default_to_84.sql
--   - join_single_session from 20260506100000_capacity_guardrails_audit.sql
--
-- Perf note: confirmed_count is a correlated subquery on session_attendance
-- using the UNIQUE(session_id, user_id) index — O(log n) per row, ~100–200
-- rows in the typical 84-day window. No new triggers, no new joins.

-- ── 1. Public upcoming-sessions RPCs (return type changes → DROP first) ──
DROP FUNCTION IF EXISTS public.get_coach_upcoming_sessions(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_school_upcoming_sessions(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_coach_upcoming_sessions(
  p_coach_id UUID,
  p_days INTEGER DEFAULT 84
)
RETURNS TABLE (
  session_id UUID,
  training_id UUID,
  training_name TEXT,
  sport TEXT,
  invite_code TEXT,
  is_recurring BOOLEAN,
  drop_in_policy TEXT,
  booking_mode TEXT,
  type TEXT,
  coach_id UUID,
  coach_name TEXT,
  coach_avatar_url TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  max_players INTEGER,
  confirmed_count INTEGER,
  allow_waitlist BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id              AS session_id,
    t.id               AS training_id,
    t.name             AS training_name,
    t.sport,
    t.invite_code,
    t.is_recurring,
    t.drop_in_policy,
    t.booking_mode,
    t.type,
    t.coach_id,
    p.full_name        AS coach_name,
    p.avatar_url       AS coach_avatar_url,
    ts.session_date,
    ts.start_time,
    ts.end_time,
    t.max_players,
    (SELECT count(*)::INTEGER FROM session_attendance sa
       WHERE sa.session_id = ts.id AND sa.status = 'confirmed') AS confirmed_count,
    t.allow_waitlist
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  LEFT JOIN profiles p ON p.id = t.coach_id
  WHERE t.coach_id = p_coach_id
    AND t.is_active = true
    AND t.visibility = 'discoverable'
    AND ts.status = 'scheduled'
    AND ts.session_date >= CURRENT_DATE
    AND ts.session_date <= CURRENT_DATE + p_days
  ORDER BY ts.session_date ASC, ts.start_time ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_upcoming_sessions(
  p_school_id UUID,
  p_days INTEGER DEFAULT 84
)
RETURNS TABLE (
  session_id UUID,
  training_id UUID,
  training_name TEXT,
  sport TEXT,
  invite_code TEXT,
  is_recurring BOOLEAN,
  drop_in_policy TEXT,
  booking_mode TEXT,
  type TEXT,
  coach_id UUID,
  coach_name TEXT,
  coach_avatar_url TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  max_players INTEGER,
  confirmed_count INTEGER,
  allow_waitlist BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id              AS session_id,
    t.id               AS training_id,
    t.name             AS training_name,
    t.sport,
    t.invite_code,
    t.is_recurring,
    t.drop_in_policy,
    t.booking_mode,
    t.type,
    t.coach_id,
    p.full_name        AS coach_name,
    p.avatar_url       AS coach_avatar_url,
    ts.session_date,
    ts.start_time,
    ts.end_time,
    t.max_players,
    (SELECT count(*)::INTEGER FROM session_attendance sa
       WHERE sa.session_id = ts.id AND sa.status = 'confirmed') AS confirmed_count,
    t.allow_waitlist
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  LEFT JOIN profiles p ON p.id = t.coach_id
  WHERE t.school_id = p_school_id
    AND t.is_active = true
    AND t.visibility = 'discoverable'
    AND t.type = 'group'
    AND ts.status = 'scheduled'
    AND ts.session_date >= CURRENT_DATE
    AND ts.session_date <= CURRENT_DATE + p_days
  ORDER BY ts.session_date ASC, ts.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_upcoming_sessions(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_school_upcoming_sessions(UUID, INTEGER) TO anon, authenticated;

-- Restore the 15s timeout that was set on the old function signature.
ALTER FUNCTION public.join_single_session(uuid) SET statement_timeout = '15s';

-- ── 2. join_single_session: route full sessions to the waitlist ─────────
CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS void
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
END;
$$;
