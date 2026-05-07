-- Diagnostic helpers: run EXPLAIN ANALYZE inside the DB on the slow user-
-- facing RPCs while pretending to be a specific user. We need this because:
--   1. PostgREST doesn't expose arbitrary SQL.
--   2. The slow RPCs (get_my_conversations, get_my_upcoming_sessions) are
--      SECURITY DEFINER and use auth.uid() — running them as service_role
--      with empty claims returns nothing, so timing is meaningless.
--
-- These helpers PERFORM set_config to inject a 'sub' claim, then EXPLAIN
-- the actual function. Service-role only; will be dropped after we finish
-- the perf investigation.

CREATE OR REPLACE FUNCTION public.__diag_upcoming_plan(p_user UUID, p_days INT DEFAULT 60)
RETURNS SETOF TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);

  RETURN QUERY EXECUTE format(
    'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
     SELECT * FROM public.get_my_upcoming_sessions(CURRENT_DATE, (CURRENT_DATE + INTERVAL %L)::date)',
    p_days::text || ' days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.__diag_conversations_plan(p_user UUID)
RETURNS SETOF TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);

  RETURN QUERY EXECUTE
    'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM public.get_my_conversations()';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.__diag_upcoming_plan(UUID, INT)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.__diag_conversations_plan(UUID)     FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.__diag_upcoming_plan(UUID, INT)     TO service_role;
GRANT  EXECUTE ON FUNCTION public.__diag_conversations_plan(UUID)     TO service_role;
