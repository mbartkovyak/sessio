-- Fix: "Coaches and owners manage join requests" was FOR ALL, which made
-- its USING clause act as WITH CHECK for INSERT — blocking players from
-- creating join requests. Split into SELECT + UPDATE + DELETE only.
DROP POLICY IF EXISTS "Coaches and owners manage join requests" ON public.join_requests;

CREATE POLICY "Coaches and owners read join requests" ON public.join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings WHERE id = training_id AND (
        coach_id = auth.uid()
        OR (school_id IS NOT NULL AND owns_school(school_id))
      )
    )
  );

CREATE POLICY "Coaches and owners update join requests" ON public.join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings WHERE id = training_id AND (
        coach_id = auth.uid()
        OR (school_id IS NOT NULL AND owns_school(school_id))
      )
    )
  );

CREATE POLICY "Coaches and owners delete join requests" ON public.join_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainings WHERE id = training_id AND (
        coach_id = auth.uid()
        OR (school_id IS NOT NULL AND owns_school(school_id))
      )
    )
  );
