-- RPC to fetch upcoming sessions for a training invite page.
-- SECURITY DEFINER so non-members can see sessions before joining.

CREATE OR REPLACE FUNCTION public.get_upcoming_sessions(p_training_id UUID, p_limit INTEGER DEFAULT 8)
RETURNS TABLE (
  id UUID,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only return sessions for active trainings
  IF NOT EXISTS (SELECT 1 FROM trainings WHERE trainings.id = p_training_id AND is_active = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ts.id, ts.session_date, ts.start_time, ts.end_time, ts.status::text
  FROM training_sessions ts
  WHERE ts.training_id = p_training_id
    AND ts.status = 'scheduled'
    AND ts.session_date >= CURRENT_DATE
  ORDER BY ts.session_date ASC
  LIMIT p_limit;
END;
$$;
