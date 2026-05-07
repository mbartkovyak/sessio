-- get_my_conversations was hitting 5s peaks (1s mean) on prod per
-- pg_stat_statements. Two issues in the original CTE-heavy plan:
--   1. The `latest_msgs` CTE used DISTINCT ON across the whole join with
--      messages → required a sort, not a per-conversation seek.
--   2. The `unread` CTE filtered `m.sender_id != auth.uid()` after a join
--      that scanned messages for every user's conversations.
--
-- Refactor: each conversation is touched once via lateral joins. Latest
-- message is a bounded LIMIT 1 lookup using the existing
-- idx_messages_conversation(conversation_id, created_at) index (Postgres
-- scans backward for ORDER BY ... DESC). Unread count and DM partner are
-- also lateral, scoped per conversation.
--
-- Adds an explicit DESC index too so the planner doesn't have to choose
-- backward scan over a regular forward scan.
--
-- Body copied from current state (20260328220000_conversation_rpcs.sql)
-- and patched in-place per CLAUDE.md "copy current body, not stale" rule.

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc
  ON public.messages (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  training_id uuid,
  training_name text,
  training_sport text,
  dm_user_id uuid,
  dm_user_name text,
  dm_avatar_url text,
  hidden boolean,
  last_message_content text,
  last_message_sender_name text,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.conversation_id,
    c.training_id,
    t.name AS training_name,
    t.sport AS training_sport,
    dp.user_id AS dm_user_id,
    dp.full_name AS dm_user_name,
    dp.avatar_url AS dm_avatar_url,
    cp.hidden,
    lm.content AS last_message_content,
    lm.sender_name AS last_message_sender_name,
    lm.created_at AS last_message_at,
    COALESCE(u.cnt, 0)::bigint AS unread_count
  FROM conversation_participants cp
  JOIN conversations c ON c.id = cp.conversation_id
  LEFT JOIN trainings t ON t.id = c.training_id
  LEFT JOIN LATERAL (
    SELECT m.content,
           p.full_name AS sender_name,
           m.created_at
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
  ) u ON true
  LEFT JOIN LATERAL (
    -- DM partner: only relevant for conversations without a training_id.
    -- LIMIT 1 because DMs are 1:1 and we just need the other side.
    SELECT cp2.user_id, p.full_name, p.avatar_url
    FROM conversation_participants cp2
    JOIN profiles p ON p.id = cp2.user_id
    WHERE cp2.conversation_id = c.id
      AND cp2.user_id <> auth.uid()
      AND c.training_id IS NULL
    LIMIT 1
  ) dp ON true
  WHERE cp.user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
