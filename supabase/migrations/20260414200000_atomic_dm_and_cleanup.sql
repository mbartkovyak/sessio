-- ============================================================
-- Atomic DM creation + duplicate cleanup
--
-- Problem: getOrCreateDMConversation() on the client does 3
-- sequential SELECT queries then INSERT. Two concurrent calls
-- can both pass the "no DM exists" check and create duplicates.
--
-- Fix: server-side SECURITY DEFINER function with advisory lock
-- guarantees exactly one DM per user pair. Existing duplicates
-- are merged (messages moved to the oldest, extras deleted).
-- ============================================================

-- 1. Atomic get-or-create DM function
CREATE OR REPLACE FUNCTION public.get_or_create_dm(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_conv_id uuid;
  v_lock_key bigint;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;

  -- Deterministic lock key from the sorted user pair (prevents deadlocks)
  v_lock_key := (hashtext(LEAST(v_me::text, p_other_user_id::text))::bigint << 32)
              | (hashtext(GREATEST(v_me::text, p_other_user_id::text))::bigint & x'FFFFFFFF'::bigint);

  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Find existing DM
  SELECT c.id INTO v_conv_id
  FROM conversations c
  JOIN conversation_participants cp1
    ON cp1.conversation_id = c.id AND cp1.user_id = v_me
  JOIN conversation_participants cp2
    ON cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
  WHERE c.training_id IS NULL
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Create new DM
  v_conv_id := gen_random_uuid();
  INSERT INTO conversations (id) VALUES (v_conv_id);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    (v_conv_id, v_me),
    (v_conv_id, p_other_user_id);

  RETURN v_conv_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_dm(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;

-- 2. Merge existing duplicate DM conversations
DO $$
DECLARE
  rec RECORD;
  v_keep_id uuid;
BEGIN
  FOR rec IN
    SELECT
      LEAST(cp1.user_id, cp2.user_id) AS user_a,
      GREATEST(cp1.user_id, cp2.user_id) AS user_b,
      array_agg(c.id ORDER BY c.created_at ASC) AS conv_ids
    FROM conversations c
    JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
    JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
      AND cp2.user_id > cp1.user_id
    WHERE c.training_id IS NULL
    GROUP BY LEAST(cp1.user_id, cp2.user_id),
             GREATEST(cp1.user_id, cp2.user_id)
    HAVING COUNT(*) > 1
  LOOP
    v_keep_id := rec.conv_ids[1];

    -- Move messages from duplicates to the kept conversation
    UPDATE messages
    SET conversation_id = v_keep_id
    WHERE conversation_id = ANY(rec.conv_ids[2:]);

    -- Merge last_read_at: keep the latest per user
    UPDATE conversation_participants cp_keep
    SET last_read_at = GREATEST(cp_keep.last_read_at, (
      SELECT MAX(cp_dup.last_read_at)
      FROM conversation_participants cp_dup
      WHERE cp_dup.conversation_id = ANY(rec.conv_ids[2:])
        AND cp_dup.user_id = cp_keep.user_id
    ))
    WHERE cp_keep.conversation_id = v_keep_id;

    -- Delete duplicate participants then conversations
    DELETE FROM conversation_participants
    WHERE conversation_id = ANY(rec.conv_ids[2:]);

    DELETE FROM conversations
    WHERE id = ANY(rec.conv_ids[2:]);
  END LOOP;
END;
$$;

-- 3. Grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
