-- Conversation list + unread count RPCs
-- Replaces 5+ client-side queries with single optimized SQL calls

-- Returns all conversation data needed for the chat list page
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
  WITH my_convos AS (
    SELECT cp.conversation_id, cp.last_read_at, cp.hidden
    FROM conversation_participants cp
    WHERE cp.user_id = auth.uid()
  ),
  latest_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      p.full_name AS sender_name,
      m.created_at
    FROM messages m
    JOIN my_convos mc ON mc.conversation_id = m.conversation_id
    LEFT JOIN profiles p ON p.id = m.sender_id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread AS (
    SELECT m.conversation_id, COUNT(*) AS cnt
    FROM messages m
    JOIN my_convos mc ON mc.conversation_id = m.conversation_id
    WHERE m.sender_id != auth.uid()
      AND (mc.last_read_at IS NULL OR m.created_at > mc.last_read_at)
    GROUP BY m.conversation_id
  ),
  dm_partners AS (
    SELECT DISTINCT ON (cp.conversation_id)
      cp.conversation_id, cp.user_id, p.full_name, p.avatar_url
    FROM conversation_participants cp
    JOIN my_convos mc ON mc.conversation_id = cp.conversation_id
    JOIN conversations c ON c.id = cp.conversation_id AND c.training_id IS NULL
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.user_id != auth.uid()
    ORDER BY cp.conversation_id
  )
  SELECT
    mc.conversation_id,
    c.training_id,
    t.name AS training_name,
    t.sport AS training_sport,
    dp.user_id AS dm_user_id,
    dp.full_name AS dm_user_name,
    dp.avatar_url AS dm_avatar_url,
    mc.hidden,
    lm.content AS last_message_content,
    lm.sender_name AS last_message_sender_name,
    lm.created_at AS last_message_at,
    COALESCE(u.cnt, 0)::bigint AS unread_count
  FROM my_convos mc
  JOIN conversations c ON c.id = mc.conversation_id
  LEFT JOIN trainings t ON t.id = c.training_id
  LEFT JOIN latest_msgs lm ON lm.conversation_id = mc.conversation_id
  LEFT JOIN unread u ON u.conversation_id = mc.conversation_id
  LEFT JOIN dm_partners dp ON dp.conversation_id = mc.conversation_id;
$$;

-- Returns total unread message count for the nav badge
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
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
$$;

-- Restrict to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_unread_count() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_unread_count() TO authenticated;
