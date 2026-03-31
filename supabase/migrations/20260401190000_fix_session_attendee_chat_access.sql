-- Fix: session attendees (drop-ins) were not added to conversation_participants,
-- so they could send messages but not read them back (RLS blocks SELECT without participant row).
-- The existing trigger only fires on training_members INSERT, missing the session_attendance path.

-- 1. Trigger: session attendance → add to training conversation
CREATE OR REPLACE FUNCTION public.add_session_attendee_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.training_sessions ts
  JOIN public.conversations c ON c.training_id = ts.training_id
  WHERE ts.id = NEW.session_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_session_attendee_added
  AFTER INSERT ON public.session_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.add_session_attendee_to_conversation();

-- 2. Backfill: add existing session attendees who are missing from conversation_participants
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT DISTINCT c.id, sa.user_id
FROM public.session_attendance sa
JOIN public.training_sessions ts ON ts.id = sa.session_id
JOIN public.conversations c ON c.training_id = ts.training_id
ON CONFLICT DO NOTHING;
