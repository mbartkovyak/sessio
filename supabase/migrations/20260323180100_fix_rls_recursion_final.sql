-- FINAL FIX: Break ALL cross-references between conversation tables.
-- The recursion cycle was:
--   conversations policy → conversation_participants → conversations → ...
-- Solution: each table's policy ONLY checks its own data or trainings/schools.
-- No cross-references between conversations and conversation_participants policies.

-- 1. conversation_participants: ONLY check user_id directly
DROP POLICY IF EXISTS "View participants" ON public.conversation_participants;
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- 2. conversations: check training ownership only (no participant check)
--    DM conversations are found via conversation_participants in app code,
--    not via the conversations table directly.
DROP POLICY IF EXISTS "View conversations" ON public.conversations;
CREATE POLICY "View conversations" ON public.conversations FOR SELECT
  USING (
    -- Training conversation: I'm the coach
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    -- Training conversation: I own the school
    OR EXISTS (
      SELECT 1 FROM public.trainings t
      JOIN public.schools s ON s.id = t.school_id
      WHERE t.id = training_id AND s.owner_id = auth.uid()
    )
    -- DM conversation: no training_id, allow if I'm a participant
    -- (safe: this references conversation_participants which doesn't reference back)
    OR (training_id IS NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    ))
  );

-- 3. messages: check via conversation_participants (which only checks user_id)
--    + training coach/owner checks
DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    -- I'm a participant
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
    -- Or training coach
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    -- Or school owner
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      JOIN public.schools s ON s.id = t.school_id
      WHERE c.id = conversation_id AND s.owner_id = auth.uid()
    )
  );
