-- Athletes need to see training conversations.
-- Previously only coaches and school owners could see training conversations.
-- Add: training conversation where I'm a training member.

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
    -- Training conversation: I'm a member of the training
    OR EXISTS (
      SELECT 1 FROM public.training_members tm
      WHERE tm.training_id = training_id AND tm.user_id = auth.uid()
    )
    -- DM conversation: I'm a participant
    OR (training_id IS NULL AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    ))
  );
