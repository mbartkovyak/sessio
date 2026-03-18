-- When a new member joins a training (or gets moved to 'regular'),
-- auto-create pending attendance records for all future sessions.

CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create attendance for regular members (not waitlist)
  IF NEW.role = 'regular' THEN
    INSERT INTO public.session_attendance (session_id, user_id, status)
    SELECT ts.id, NEW.user_id, 'pending'
    FROM public.training_sessions ts
    WHERE ts.training_id = NEW.training_id
      AND ts.session_date >= CURRENT_DATE
      AND ts.status = 'scheduled'
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Fire on INSERT (new member joins) and UPDATE (e.g. waitlist → regular)
CREATE TRIGGER trg_attendance_on_member_join
AFTER INSERT OR UPDATE ON public.training_members
FOR EACH ROW
EXECUTE FUNCTION public.create_attendance_for_new_member();
