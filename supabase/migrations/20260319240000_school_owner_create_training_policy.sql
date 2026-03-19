-- Allow school owners to create trainings for their school's coaches
CREATE POLICY "School owners create trainings for coaches" ON public.trainings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id AND s.owner_id = auth.uid()
    )
  );

-- Allow school owners to manage trainings in their school
CREATE POLICY "School owners manage school trainings" ON public.trainings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id AND s.owner_id = auth.uid()
    )
  );
