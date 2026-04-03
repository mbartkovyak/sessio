-- Fix regression from set_search_path migration which dropped school owner
-- from create_training_conversation(). Also backfill missing participants.

-- 1. Fix the trigger function: re-add school owner to new training conversations
CREATE OR REPLACE FUNCTION public.create_training_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.conversations (id, training_id) VALUES (_conv_id, NEW.id);
  INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (_conv_id, NEW.coach_id);
  IF NEW.school_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    SELECT _conv_id, s.owner_id FROM public.schools s WHERE s.id = NEW.school_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Backfill: ensure all coaches are in their training conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, t.coach_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
ON CONFLICT DO NOTHING;

-- 3. Backfill: school owners in their school's training conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, s.owner_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
JOIN public.schools s ON s.id = t.school_id
ON CONFLICT DO NOTHING;

-- 4. Backfill: training members
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM public.conversations c
JOIN public.training_members tm ON tm.training_id = c.training_id
ON CONFLICT DO NOTHING;

-- 5. Backfill: session attendees (drop-ins)
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT DISTINCT c.id, sa.user_id
FROM public.session_attendance sa
JOIN public.training_sessions ts ON ts.id = sa.session_id
JOIN public.conversations c ON c.training_id = ts.training_id
ON CONFLICT DO NOTHING;

-- 6. Grant service_role full access on all public tables.
-- Prod was missing these grants, causing Edge Functions (which use service_role)
-- to silently fail on all table queries — no push notifications sent.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
