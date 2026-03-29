-- When a member leaves (or is removed from) a training,
-- delete their FUTURE session_attendance rows for that training.
-- Past rows are preserved for history.

CREATE OR REPLACE FUNCTION public.cleanup_attendance_on_member_leave()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.session_attendance
  WHERE user_id = OLD.user_id
    AND session_id IN (
      SELECT id FROM public.training_sessions
      WHERE training_id = OLD.training_id
        AND session_date >= CURRENT_DATE
    );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_attendance_on_member_leave
BEFORE DELETE ON public.training_members
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_attendance_on_member_leave();
