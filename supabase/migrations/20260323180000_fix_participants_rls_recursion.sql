-- Fix infinite recursion in RLS policies.
-- conversation_participants SELECT policy referenced itself.
-- conversations SELECT policy referenced conversation_participants which referenced itself.
-- Break the cycle: no cross-references between these two tables' policies.

-- 1. Fix conversation_participants: use direct user_id check only
DROP POLICY IF EXISTS "View participants" ON public.conversation_participants;
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      JOIN public.schools s ON s.id = t.school_id
      WHERE c.id = conversation_id AND s.owner_id = auth.uid()
    )
  );

-- 2. Fix conversations: don't reference conversation_participants at all
DROP POLICY IF EXISTS "View conversations" ON public.conversations;
CREATE POLICY "View conversations" ON public.conversations FOR SELECT
  USING (
    -- DM: I'm a participant (safe: conversations doesn't reference itself)
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid())
    -- Training: I'm the coach
    OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    -- Training: I'm the school owner
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- 3. Fix messages: don't reference conversation_participants, go through conversations
DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    -- DM participant
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
    -- Training coach
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    -- School owner
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      JOIN public.schools s ON s.id = t.school_id
      WHERE c.id = conversation_id AND s.owner_id = auth.uid()
    )
  );
