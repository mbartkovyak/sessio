-- Bound get_my_unread_count() to the last 30 days.
--
-- Why: the RPC scans every message in every conversation the user is part of,
-- with no time bound. Tail latency was max 4.7s on prod (pg_stat_statements),
-- and it's called on every page mount via the bottom nav badge — so under
-- light DB pressure, the badge query was a noticeable contributor to the
-- coach Home page feeling sluggish after multiple parents joined.
--
-- A 30-day window is plenty for an unread badge: if a message has sat unread
-- for a month, it's not driving any action. The chats list itself still
-- shows historical messages — only the navigation badge count is bounded.
--
-- Source body: 20260328220000_conversation_rpcs.sql (lines 81-95).
-- Signature, security, and grants are unchanged.

CREATE OR REPLACE FUNCTION public.get_my_unread_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::bigint
  FROM messages m
  JOIN conversation_participants cp
    ON cp.conversation_id = m.conversation_id
    AND cp.user_id = auth.uid()
  WHERE m.sender_id != auth.uid()
    AND m.created_at > NOW() - INTERVAL '30 days'
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_unread_count() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_unread_count() TO authenticated;
