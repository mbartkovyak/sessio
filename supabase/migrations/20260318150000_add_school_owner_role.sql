-- 1. Add school_owner to profiles role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('coach', 'player', 'school_owner'));

-- 2. Helper: check if user owns the school that a training belongs to
CREATE OR REPLACE FUNCTION public.is_school_owner_of_training(p_training_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainings t
    JOIN public.schools s ON s.id = t.school_id
    WHERE t.id = p_training_id
    AND s.owner_id = auth.uid()
  );
$$;

-- 3. Helper: check if user owns a school
CREATE OR REPLACE FUNCTION public.owns_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools WHERE id = p_school_id AND owner_id = auth.uid()
  );
$$;

-- 4. Update trainings policies — school owner can manage all trainings in their school
DROP POLICY IF EXISTS "Coaches manage own trainings" ON public.trainings;
CREATE POLICY "Coaches and owners manage trainings" ON public.trainings FOR ALL
  USING (
    coach_id = auth.uid()
    OR (school_id IS NOT NULL AND owns_school(school_id))
  );

-- 5. Update training_members — school owner can manage rosters
DROP POLICY IF EXISTS "Coaches manage training members" ON public.training_members;
CREATE POLICY "Coaches and owners manage training members" ON public.training_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- 6. Update session_attendance — school owner can view/manage attendance
DROP POLICY IF EXISTS "Coaches manage attendance" ON public.session_attendance;
CREATE POLICY "Coaches and owners manage attendance" ON public.session_attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.trainings t ON ts.training_id = t.id
      WHERE ts.id = session_id AND (
        t.coach_id = auth.uid()
        OR (t.school_id IS NOT NULL AND owns_school(t.school_id))
      )
    )
  );

-- 7. Update join_requests — school owner can manage
DROP POLICY IF EXISTS "Coaches manage join requests" ON public.join_requests;
CREATE POLICY "Coaches and owners manage join requests" ON public.join_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings WHERE id = training_id AND (
        coach_id = auth.uid()
        OR (school_id IS NOT NULL AND owns_school(school_id))
      )
    )
  );

-- 8. School members — school owner can manage their school's coaches
DROP POLICY IF EXISTS "School members viewable" ON public.school_members;
DROP POLICY IF EXISTS "School owners manage members" ON public.school_members;
CREATE POLICY "School members viewable by members and owner" ON public.school_members FOR SELECT
  USING (
    coach_id = auth.uid()
    OR owns_school(school_id)
  );
CREATE POLICY "School owners manage members" ON public.school_members FOR ALL
  USING (owns_school(school_id));

-- 9. Coach profiles visible to school owner (for school management)
-- Already covered by existing "Coaches discoverable" policy on profiles

-- 10. Training sessions — school owner can manage
DROP POLICY IF EXISTS "Coaches manage sessions" ON public.training_sessions;
CREATE POLICY "Coaches and owners manage sessions" ON public.training_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings WHERE id = training_id AND (
        coach_id = auth.uid()
        OR (school_id IS NOT NULL AND owns_school(school_id))
      )
    )
  );

-- 11. Training messages — school owner can read all school messages
DROP POLICY IF EXISTS "Training chat access" ON public.training_messages;
CREATE POLICY "Training chat access" ON public.training_messages FOR SELECT
  USING (
    is_training_member(training_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- Keep insert policy for messages (only members and coaches send)
DROP POLICY IF EXISTS "Training chat send" ON public.training_messages;
CREATE POLICY "Training chat send" ON public.training_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      is_training_member(training_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
    )
  );
