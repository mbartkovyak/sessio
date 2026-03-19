-- 1. Coach approval: add status to school_members
ALTER TABLE public.school_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'declined'));

-- School owners can update member status (approve/decline)
-- Already covered by "School owners manage members" FOR ALL policy

-- 2. Favourite schools for athletes
CREATE TABLE IF NOT EXISTS public.favourite_schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id)
);
ALTER TABLE public.favourite_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favourites" ON public.favourite_schools FOR ALL USING (auth.uid() = user_id);

-- 3. Allow unauthenticated users to view schools (for public school profile)
DROP POLICY IF EXISTS "Schools viewable by authenticated" ON public.schools;
CREATE POLICY "Schools viewable by anyone" ON public.schools FOR SELECT USING (true);

-- 4. Allow unauthenticated users to view discoverable group trainings
CREATE POLICY "Public group trainings viewable" ON public.trainings FOR SELECT
  USING (is_active = true AND type = 'group' AND visibility = 'discoverable');
