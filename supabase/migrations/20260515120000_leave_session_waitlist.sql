-- Lets a player opt out of the per-session waitlist (status = 'pending').
-- Hard-deletes the row so the player disappears from the coach's view entirely;
-- they did not have a confirmed seat to "decline", they just withdrew interest.
--
-- Guarded to only act on 'pending' rows. Confirmed/declined attendees keep
-- using the existing confirm_session_attendance / decline_session_attendance
-- RPCs which preserve audit history.

CREATE OR REPLACE FUNCTION public.leave_session_waitlist(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.session_attendance
  WHERE session_id = p_session_id
    AND user_id = v_user
    AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_session_waitlist(UUID) TO authenticated;
