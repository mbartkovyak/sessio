-- Goal #1: app never gets stuck for 5+ seconds.
--
-- Even if some queries are slow under load (RLS chains, lock waits, hot paths
-- like get_my_conversations) the user-facing UX must never hang past 5s.
-- Bound the authenticated role's statement_timeout at 5s — beyond that we
-- surface an error fast rather than show a frozen spinner.
--
-- Critical write RPCs that fire trigger cascades (recurring join writing
-- session_attendance for many upcoming sessions) need headroom; ALTER FUNCTION
-- ... SET overrides the role default per function call.
ALTER ROLE authenticated SET statement_timeout = '5s';

-- Capacity / join RPCs: cascade-heavy writes, give them 15s before failing.
ALTER FUNCTION public.join_training(uuid)               SET statement_timeout = '15s';
ALTER FUNCTION public.join_single_session(uuid)         SET statement_timeout = '15s';
ALTER FUNCTION public.coach_add_to_session(uuid, uuid)  SET statement_timeout = '15s';
ALTER FUNCTION public.confirm_session_attendance(uuid)  SET statement_timeout = '15s';
ALTER FUNCTION public.decline_session_attendance(uuid)  SET statement_timeout = '15s';

-- Onboarding / school setup writes also touch multiple tables; give them
-- the same headroom so the questionnaire doesn't fail under contention.
ALTER FUNCTION public.delete_my_account()               SET statement_timeout = '30s';
