-- =============================================================
-- Fix: Profiles RLS for training-based system
--
-- The old "Group members view each other profiles" policy
-- references the legacy groups/group_members tables.
-- Replace with training-based visibility.
-- =============================================================

-- Drop legacy group-based policy
DROP POLICY IF EXISTS "Group members view each other profiles" ON public.profiles;

-- 1. Coach profiles are discoverable by all authenticated users (search/discovery)
CREATE POLICY "Coach profiles discoverable"
ON public.profiles FOR SELECT
USING (role = 'coach' AND auth.role() = 'authenticated');

-- 2. Coaches can see their training members' profiles (roster, chat)
CREATE POLICY "Coaches view training member profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trainings t
    JOIN public.training_members tm ON tm.training_id = t.id
    WHERE t.coach_id = auth.uid() AND tm.user_id = profiles.id
  )
);

-- 3. Training members can see each other + their coach (chat, attendance)
CREATE POLICY "Training participants view each other"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_members my_tm
    JOIN public.trainings t ON t.id = my_tm.training_id
    WHERE my_tm.user_id = auth.uid()
    AND (
      profiles.id = t.coach_id
      OR EXISTS (
        SELECT 1 FROM public.training_members other_tm
        WHERE other_tm.training_id = my_tm.training_id
        AND other_tm.user_id = profiles.id
      )
    )
  )
);

-- Force PostgREST to pick up the new policies
NOTIFY pgrst, 'reload schema';
