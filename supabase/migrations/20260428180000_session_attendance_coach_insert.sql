-- Allow coaches and school owners to insert session_attendance rows
-- for sessions belonging to their training. Required by the one-off
-- "Add participant" flow on SessionDetail (src/pages/coach/SessionDetail.tsx).
-- Recurring adds go via the create_attendance_for_new_member trigger
-- (SECURITY DEFINER) and are unaffected.

DROP POLICY IF EXISTS "Coaches and owners insert attendance" ON public.session_attendance;

CREATE POLICY "Coaches and owners insert attendance" ON public.session_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.trainings t ON ts.training_id = t.id
      WHERE ts.id = session_id AND (
        t.coach_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
      )
    )
  );
