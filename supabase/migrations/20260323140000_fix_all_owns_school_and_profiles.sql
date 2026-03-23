-- ============================================================
-- Replace ALL owns_school() calls with direct subqueries.
-- owns_school() is SECURITY DEFINER + auth.uid() which is
-- unreliable in RLS policy context.
-- Also fix profiles visibility for join request applicants.
-- ============================================================

-- 1. TRAININGS — replace FOR ALL with split policies
DROP POLICY IF EXISTS "Coaches and owners manage trainings" ON public.trainings;

CREATE POLICY "Coaches and owners select trainings" ON public.trainings FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Coaches and owners insert trainings" ON public.trainings FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Coaches and owners update trainings" ON public.trainings FOR UPDATE
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Coaches and owners delete trainings" ON public.trainings FOR DELETE
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

-- 2. TRAINING_SESSIONS — replace FOR ALL with split policies
DROP POLICY IF EXISTS "Coaches and owners manage sessions" ON public.training_sessions;

CREATE POLICY "Coaches and owners select sessions" ON public.training_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners update sessions" ON public.training_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners delete sessions" ON public.training_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners insert sessions" ON public.training_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = training_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

-- 3. SESSION_ATTENDANCE — replace FOR ALL with split policies
DROP POLICY IF EXISTS "Coaches and owners manage attendance" ON public.session_attendance;

CREATE POLICY "Coaches and owners select attendance" ON public.session_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.trainings t ON ts.training_id = t.id
      WHERE ts.id = session_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners update attendance" ON public.session_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.trainings t ON ts.training_id = t.id
      WHERE ts.id = session_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

-- 4. SCHOOL_MEMBERS — replace owns_school() calls
DROP POLICY IF EXISTS "School members viewable by members and owner" ON public.school_members;
DROP POLICY IF EXISTS "School owners manage members" ON public.school_members;

CREATE POLICY "School members viewable by members and owner" ON public.school_members FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "School owners insert members" ON public.school_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "School owners update members" ON public.school_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "School owners delete members" ON public.school_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

-- 5. PROFILES — coaches/owners can see profiles of people who sent join requests
-- (they're not training members yet, so existing policies don't cover them)
CREATE POLICY "Coaches view join request profiles" ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.join_requests jr
      JOIN public.trainings t ON t.id = jr.training_id
      WHERE jr.user_id = profiles.id
      AND jr.status = 'pending'
      AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );
