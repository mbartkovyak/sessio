-- Fix: the previous policy caused infinite recursion by querying profiles
-- from within a profiles SELECT policy. Replace with a simple non-recursive check.

DROP POLICY IF EXISTS "Coaches and owners search player profiles" ON public.profiles;
DROP POLICY IF EXISTS "School owners view placeholder profiles" ON public.profiles;

-- All authenticated users can see player profiles (name, avatar — not sensitive).
-- This enables pass assignment search without recursive RLS.
CREATE POLICY "Authenticated users view player profiles"
ON public.profiles FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (role = 'player' OR is_placeholder = true)
);
