-- ============================================================
-- Content moderation: report + block for Apple Guideline 1.2
--
-- Tables: content_flags (report messages/reviews),
--         blocked_users (user-to-user blocking)
-- Server-side enforcement: blocked users' messages excluded
-- via RLS on messages table.
-- ============================================================

-- ═══════════════════════════════════════════════════
-- 1. content_flags — flag offensive messages/reviews
-- ═══════════════════════════════════════════════════

CREATE TABLE public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flagged_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('message', 'review')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> flagged_user_id)
);

-- One flag per reporter per content item (prevents spam-reporting)
CREATE UNIQUE INDEX content_flags_dedupe
  ON public.content_flags (reporter_id, content_type, content_id);

-- ═══════════════════════════════════════════════════
-- 2. blocked_users — user-to-user blocking
-- ═══════════════════════════════════════════════════

CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ═══════════════════════════════════════════════════
-- 3. RLS — split per-operation (never FOR ALL)
-- ═══════════════════════════════════════════════════

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- content_flags: users insert and read their own flags
CREATE POLICY "insert_own_flags" ON public.content_flags
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "select_own_flags" ON public.content_flags
  FOR SELECT USING (auth.uid() = reporter_id);

-- blocked_users: users manage their own blocks (explicit per-op)
CREATE POLICY "select_own_blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);
-- Users can see if they've been blocked (needed for "Send messages"
-- RLS on messages table to enforce DM send blocking).
CREATE POLICY "select_blocked_by" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocked_id);
CREATE POLICY "insert_own_blocks" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "delete_own_blocks" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- ═══════════════════════════════════════════════════
-- 4. Server-side message blocking via RLS
-- ═══════════════════════════════════════════════════

-- Amend "Read messages": exclude messages from blocked users.
-- Current policy (from 20260324160000): participant-based only.
DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    -- Participant in conversation
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
    -- Exclude messages from blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users bu
      WHERE bu.blocker_id = auth.uid() AND bu.blocked_id = messages.sender_id
    )
  );

-- Amend "Send messages": blocked users can't send to blocker's DMs.
DROP POLICY IF EXISTS "Send messages" ON public.messages;
CREATE POLICY "Send messages" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    -- In DMs, blocked users cannot send to the blocker
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users bu
      JOIN public.conversations c ON c.id = conversation_id
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.training_id IS NULL          -- DM only
        AND bu.blocked_id = auth.uid()     -- current user is blocked
        AND bu.blocker_id = cp.user_id     -- by the other participant
        AND cp.user_id <> auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- 5. Grants for service_role (PostgREST / Edge Functions)
-- ═══════════════════════════════════════════════════

GRANT ALL ON TABLE public.content_flags TO service_role;
GRANT ALL ON TABLE public.blocked_users TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ═══════════════════════════════════════════════════
-- 6. Update delete_my_account() — clean new tables
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- ── Content moderation data ─────────────────────────────────────────
  DELETE FROM public.content_flags WHERE reporter_id = v_uid OR flagged_user_id = v_uid;
  DELETE FROM public.blocked_users WHERE blocker_id = v_uid OR blocked_id = v_uid;

  -- ── Coach-owned training cascade ──────────────────────────────────────
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT c.id FROM public.conversations c WHERE c.training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid)
  );
  DELETE FROM public.conversation_participants WHERE conversation_id IN (
    SELECT c.id FROM public.conversations c WHERE c.training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid)
  );
  DELETE FROM public.conversations WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_open_spots WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.session_attendance WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  DELETE FROM public.training_sessions WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_members WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.join_requests WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.trainings WHERE coach_id = v_uid;

  -- ── User participation data ───────────────────────────────────────────
  DELETE FROM public.messages WHERE sender_id = v_uid;
  DELETE FROM public.conversation_participants WHERE user_id = v_uid;
  DELETE FROM public.message_reactions WHERE user_id = v_uid;
  DELETE FROM public.session_attendance WHERE user_id = v_uid;
  DELETE FROM public.training_members WHERE user_id = v_uid;
  DELETE FROM public.join_requests WHERE user_id = v_uid;
  DELETE FROM public.training_open_spots WHERE claimed_by = v_uid;
  DELETE FROM public.reviews WHERE reviewer_id = v_uid OR coach_id = v_uid;
  DELETE FROM public.favourite_schools WHERE user_id = v_uid;
  DELETE FROM public.push_subscriptions WHERE user_id = v_uid;

  -- ── Player abonaments (for trainings owned by other coaches) ──────────
  DELETE FROM public.player_abonaments WHERE player_id = v_uid;

  -- ── School data ───────────────────────────────────────────────────────
  DELETE FROM public.school_members WHERE coach_id = v_uid;
  DELETE FROM public.schools WHERE owner_id = v_uid;

  -- ── Orphaned DM conversations (no participants left) ──────────────────
  DELETE FROM public.conversations c
  WHERE c.training_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    );

  -- ── Delete the auth user ──────────────────────────────────────────────
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;
