-- Fix: when JWT expires mid-session, requests fall back to anon role.
-- Without this GRANT, anon gets a hard 42501 "permission denied" before RLS even evaluates.
-- With this GRANT, anon hits RLS → 0 rows returned (no policy matches) → soft failure.
-- This is the standard Supabase pattern for public-schema tables with RLS.

GRANT SELECT ON public.profiles TO anon;
