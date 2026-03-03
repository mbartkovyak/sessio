
-- Allow anyone to view groups by invite code (needed for the join flow before auth)
CREATE POLICY "Public can view groups by invite code"
ON public.groups
FOR SELECT
USING (is_active = true);
