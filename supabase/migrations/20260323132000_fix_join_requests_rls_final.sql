-- FINAL FIX: Drop all coach/owner policies on join_requests and recreate
-- with direct subqueries instead of owns_school() function.
-- owns_school() uses SECURITY DEFINER + auth.uid() which can be unreliable in RLS context.

DROP POLICY IF EXISTS "Coaches and owners read join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Coaches and owners update join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Coaches and owners delete join requests" ON public.join_requests;

-- School owner sees join requests for any training in their school
-- Coach sees join requests for their own trainings
-- Direct subquery, no function call
CREATE POLICY "Coaches and owners read join requests" ON public.join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = join_requests.training_id
      AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners update join requests" ON public.join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = join_requests.training_id
      AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Coaches and owners delete join requests" ON public.join_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings t
      WHERE t.id = join_requests.training_id
      AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );

-- Clean up temp debug functions
DROP FUNCTION IF EXISTS public.get_join_request_policies();
DROP FUNCTION IF EXISTS public.check_rls_enabled();
DROP FUNCTION IF EXISTS public.debug_owns_school(uuid);
