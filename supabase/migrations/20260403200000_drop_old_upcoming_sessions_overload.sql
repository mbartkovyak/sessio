-- Drop the old no-params overload of get_my_upcoming_sessions.
-- The windowed version (with p_from_date, p_to_date DEFAULT NULL) supersedes it.
-- Both coexisting causes PostgREST PGRST203 ambiguity when called without params.
DROP FUNCTION IF EXISTS public.get_my_upcoming_sessions();
