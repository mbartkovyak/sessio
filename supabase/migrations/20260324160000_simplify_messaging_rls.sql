-- ============================================================
-- Simplify messaging RLS: participant-based access only
--
-- Principle: you're in the conversation → you can see it.
-- No cross-table policy chains. No external checks.
-- Triggers handle auto-adding participants.
-- ============================================================

-- 1. conversations: any authenticated user can read
--    (just an ID + training_id + timestamp — no sensitive data)
DROP POLICY IF EXISTS "View conversations" ON public.conversations;
CREATE POLICY "View conversations" ON public.conversations FOR SELECT
  USING (auth.role() = 'authenticated');
-- "Create conversations" INSERT policy already exists (authenticated)

-- 2. conversation_participants: see your own rows + rows in your conversations
DROP POLICY IF EXISTS "View participants" ON public.conversation_participants;
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT cp2.conversation_id FROM public.conversation_participants cp2
      WHERE cp2.user_id = auth.uid()
    )
  );
-- "Add participants" INSERT policy already exists (authenticated)

-- 3. messages: you can read messages in conversations you belong to
DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );
-- "Send messages" INSERT policy already exists (sender_id = auth.uid())

-- ============================================================
-- Backfill: ensure all relevant users are conversation participants
-- ============================================================

-- Coaches in their training conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, t.coach_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
ON CONFLICT DO NOTHING;

-- Training members in their training conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM public.conversations c
JOIN public.training_members tm ON tm.training_id = c.training_id
ON CONFLICT DO NOTHING;

-- School owners in their school's training conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, s.owner_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
JOIN public.schools s ON s.id = t.school_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- Update trigger: also add school owner when training is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_training_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
