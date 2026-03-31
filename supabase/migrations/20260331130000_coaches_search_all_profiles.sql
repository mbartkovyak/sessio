-- Allow coaches and school owners to search all player profiles.
-- Needed for pass assignment — coaches need to find players who
-- may not be in their trainings yet.

CREATE POLICY "Coaches and owners search player profiles"
ON public.profiles FOR SELECT
USING (
  (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('coach', 'school_owner')))
  AND role = 'player'
);

-- Ensure is_placeholder exists (created fully in a later migration, but referenced here)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;

-- Also allow school owners to see their school's placeholder athletes
CREATE POLICY "School owners view placeholder profiles"
ON public.profiles FOR SELECT
USING (
  is_placeholder = true
  AND school_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.schools s WHERE s.id = profiles.school_id AND s.owner_id = auth.uid())
);
