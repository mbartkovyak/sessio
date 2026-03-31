-- Update member count to include both series members AND drop-in session attendees.
-- A player who signed up for a single session should be counted.

CREATE OR REPLACE FUNCTION public.get_training_member_count(p_training_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(DISTINCT u)::integer
  FROM (
    -- Series members
    SELECT user_id AS u FROM training_members
    WHERE training_id = p_training_id AND role = 'regular'
    UNION
    -- Drop-in attendees (confirmed for upcoming sessions, not already members)
    SELECT sa.user_id AS u FROM session_attendance sa
    JOIN training_sessions ts ON ts.id = sa.session_id
    WHERE ts.training_id = p_training_id
      AND sa.status = 'confirmed'
      AND ts.session_date >= CURRENT_DATE
      AND ts.status = 'scheduled'
  ) participants;
$$;
