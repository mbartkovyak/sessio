-- Expose confirmed_count on each row so the player UI can hide the
-- "Підтвердити участь" claim button while a pending session is still full
-- (avoids the SESSION_FULL toast dead-end). Same correlated subquery pattern
-- already used by get_coach_upcoming_sessions / get_school_upcoming_sessions
-- in 20260507180000.
--
-- Return-type change requires DROP. Body identical to the v2 in
-- 20260401200000_windowed_upcoming_sessions.sql per CLAUDE.md "copy current
-- body" rule, only one extra column appended.

DROP FUNCTION IF EXISTS public.get_my_upcoming_sessions(date, date);

CREATE OR REPLACE FUNCTION public.get_my_upcoming_sessions(
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  attendance_id UUID,
  session_id UUID,
  attendance_status TEXT,
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  session_status TEXT,
  training_id UUID,
  training_name TEXT,
  sport TEXT,
  venue TEXT,
  max_players INTEGER,
  confirmed_count INTEGER,
  confirmation_window_hours INTEGER,
  is_active BOOLEAN,
  coach_id UUID,
  coach_full_name TEXT,
  coach_avatar_url TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id AS attendance_id,
    sa.session_id,
    sa.status::text AS attendance_status,
    sa.confirmed_at,
    sa.declined_at,
    ts.session_date,
    ts.start_time,
    ts.end_time,
    ts.status::text AS session_status,
    t.id AS training_id,
    t.name AS training_name,
    t.sport,
    t.venue,
    t.max_players,
    (SELECT count(*)::INTEGER FROM session_attendance sa2
       WHERE sa2.session_id = ts.id AND sa2.status = 'confirmed') AS confirmed_count,
    t.confirmation_window_hours,
    t.is_active,
    p.id AS coach_id,
    p.full_name AS coach_full_name,
    p.avatar_url AS coach_avatar_url
  FROM session_attendance sa
  JOIN training_sessions ts ON ts.id = sa.session_id
  JOIN trainings t ON t.id = ts.training_id
  LEFT JOIN profiles p ON p.id = t.coach_id
  WHERE sa.user_id = auth.uid()
    AND ts.session_date >= COALESCE(p_from_date, CURRENT_DATE)
    AND (p_to_date IS NULL OR ts.session_date <= p_to_date)
    AND ts.status = 'scheduled'
    AND t.is_active = true
  ORDER BY ts.session_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_upcoming_sessions(date, date) TO authenticated;
