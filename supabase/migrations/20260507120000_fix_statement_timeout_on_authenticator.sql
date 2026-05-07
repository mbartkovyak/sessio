-- The previous migration (20260507110000) set statement_timeout on the
-- `authenticated` role, but PostgREST connects as `authenticator` and uses
-- `SET LOCAL role` per request. Role-level GUC defaults from
-- pg_db_role_setting are applied at SESSION START — not on SET LOCAL ROLE —
-- so the cap on `authenticated` never took effect. User reported a 30s wait
-- on the calendar page; the timeout would have killed it at 5s.
--
-- Fix: apply on `authenticator`. That role is the one PostgREST connects as,
-- so the GUC is set at session start and stays for the life of the connection.
-- SET LOCAL role inside a request keeps the timeout.
--
-- Keep the role-level timeouts on authenticated/anon as documentation /
-- defense-in-depth for direct logins (rare in this app).
ALTER ROLE authenticator SET statement_timeout = '5s';
ALTER ROLE anon          SET statement_timeout = '5s';

-- Critical write RPCs already have ALTER FUNCTION ... SET statement_timeout
-- = '15s' from the previous migration. Those override at function call.
