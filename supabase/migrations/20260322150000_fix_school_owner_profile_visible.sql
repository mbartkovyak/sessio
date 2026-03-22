-- School owners' profiles were invisible because "Coach profiles discoverable"
-- policy only allowed role = 'coach'. School owners need to be visible too.
DROP POLICY IF EXISTS "Coach profiles discoverable" ON public.profiles;
CREATE POLICY "Coach and owner profiles discoverable"
ON public.profiles FOR SELECT
USING (role IN ('coach', 'school_owner') AND auth.role() = 'authenticated');
