-- Cleanup: drop the temporary diagnostic helpers added in
-- 20260507130000 and 20260507140000. EXPLAIN confirmed both user-facing
-- RPCs are now fast (<100ms) thanks to the new indexes. Helpers are no
-- longer needed and don't belong in long-term schema.
DROP FUNCTION IF EXISTS public.__diag_upcoming_plan(UUID, INT);
DROP FUNCTION IF EXISTS public.__diag_conversations_plan(UUID);
DROP FUNCTION IF EXISTS public.__diag_upcoming_inline(UUID, INT);
DROP FUNCTION IF EXISTS public.__diag_conversations_inline(UUID);
