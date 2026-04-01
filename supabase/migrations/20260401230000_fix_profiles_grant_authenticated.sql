-- Fix: authenticated role lost SELECT/UPDATE permission on profiles table.
-- This causes 42501 "permission denied" on every login — fresh JWT, fresh session.
-- Root cause: table was likely recreated in a migration without re-granting.
-- Standard Supabase pattern: authenticated needs SELECT + UPDATE, anon needs SELECT.

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
