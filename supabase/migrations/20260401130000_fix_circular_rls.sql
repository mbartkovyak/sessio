-- FIX: "Attendees view their sessions" created circular RLS.
-- session_attendance policy checks training_sessions, and this policy checked session_attendance.
-- Drop it immediately to restore both coach and player access.

DROP POLICY IF EXISTS "Attendees view their sessions" ON public.training_sessions;

-- Instead, provide a SECURITY DEFINER RPC for players to fetch their upcoming sessions.
-- This bypasses RLS on training_sessions for the nested join.

CREATE OR REPLACE FUNCTION public.get_my_upcoming_sessions()
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
    AND ts.session_date >= CURRENT_DATE
    AND ts.status = 'scheduled'
    AND t.is_active = true
  ORDER BY ts.session_date ASC;
END;
$$;
