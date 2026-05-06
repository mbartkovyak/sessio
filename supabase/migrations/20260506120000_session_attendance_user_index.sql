-- The smoking gun for the slow get_my_upcoming_sessions / get_my_conversations
-- p95s seen in pg_stat_statements (max 7.5s, mean 400ms).
--
-- session_attendance has UNIQUE(session_id, user_id) — that index leads with
-- session_id, so a player querying their own attendance with
-- `WHERE sa.user_id = auth.uid()` cannot use it. Every call seq-scans the
-- whole table. Hot path: player home, player calendar, "this week" cards.
--
-- Adding the user-leading index. session_id-leading reads (the unique
-- constraint, used by the BEFORE/AFTER triggers in
-- 20260506100000_capacity_guardrails_audit.sql) keep their existing index.
CREATE INDEX IF NOT EXISTS idx_session_attendance_user
  ON public.session_attendance(user_id);
