-- The previous diag helper called the SECURITY DEFINER function and the
-- inner auth.uid() never picked up our set_config jwt.claims override.
-- Easier path: EXPLAIN the underlying join with user_id as an explicit
-- parameter, bypassing auth.uid() entirely.
CREATE OR REPLACE FUNCTION public.__diag_upcoming_inline(p_user UUID, p_days INT DEFAULT 60)
RETURNS SETOF TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format($q$
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT
      sa.id, sa.session_id, sa.status, sa.confirmed_at, sa.declined_at,
      ts.session_date, ts.start_time, ts.end_time, ts.status,
      t.id, t.name, t.sport, t.venue, t.max_players,
      t.confirmation_window_hours, t.is_active,
      p.id, p.full_name, p.avatar_url
    FROM session_attendance sa
    JOIN training_sessions ts ON ts.id = sa.session_id
    JOIN trainings t ON t.id = ts.training_id
    LEFT JOIN profiles p ON p.id = t.coach_id
    WHERE sa.user_id = %L
      AND ts.session_date >= CURRENT_DATE
      AND ts.session_date <= (CURRENT_DATE + INTERVAL %L)::date
      AND ts.status = 'scheduled'
      AND t.is_active = true
    ORDER BY ts.session_date ASC
  $q$, p_user, p_days::text || ' days');
END;
$$;

CREATE OR REPLACE FUNCTION public.__diag_conversations_inline(p_user UUID)
RETURNS SETOF TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format($q$
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
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
      SELECT m.content, p.full_name AS sender_name, m.created_at
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
        AND m.sender_id <> %L
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT cp2.user_id, p.full_name, p.avatar_url
      FROM conversation_participants cp2
      JOIN profiles p ON p.id = cp2.user_id
      WHERE cp2.conversation_id = c.id
        AND cp2.user_id <> %L
        AND c.training_id IS NULL
      LIMIT 1
    ) dp ON true
    WHERE cp.user_id = %L
  $q$, p_user, p_user, p_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.__diag_upcoming_inline(UUID, INT)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.__diag_conversations_inline(UUID)      FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.__diag_upcoming_inline(UUID, INT)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.__diag_conversations_inline(UUID)      TO service_role;
