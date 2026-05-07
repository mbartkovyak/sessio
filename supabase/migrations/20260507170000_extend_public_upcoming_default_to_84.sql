-- Public coach + school profile schedules defaulted to 14 days, which is why
-- athletes saw "only 2 weeks" on a coach's profile even though the coach has
-- weekly classes scheduled months out. Bump the default to 84 days (12 weeks)
-- to match the calendar's new initial window.
--
-- Body copied from 20260428120000_get_public_upcoming_sessions.sql per the
-- "copy current body, not stale" rule. Only the p_days default changes.

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
  end_time TIME
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
    ts.end_time
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
  end_time TIME
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
    ts.end_time
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
