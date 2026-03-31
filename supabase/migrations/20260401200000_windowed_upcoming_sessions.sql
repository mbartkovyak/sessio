-- Add optional date range params to get_my_upcoming_sessions
-- Allows calendar to load only a window (e.g. 4 weeks back + 4 weeks forward)
-- Default behavior unchanged: from=CURRENT_DATE, no upper bound

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
