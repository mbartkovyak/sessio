-- Iteration on athlete-facing profiles:
--   1. favourite_coaches table (mirror of favourite_schools)
--   2. tighter "Players insert own reviews" policy (must have actually attended)
--   3. RPCs powering "Leave a review" eligibility + school review aggregation
--   4. delete_my_account() refreshed to wipe the new table

-- ═══════════════════════════════════════════════════
-- 1. favourite_coaches
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.favourite_coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, coach_id)
);
ALTER TABLE public.favourite_coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own coach favourites" ON public.favourite_coaches FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE public.favourite_coaches TO service_role;

-- ═══════════════════════════════════════════════════
-- 2. Reviews insert policy — must have attended a session
-- ═══════════════════════════════════════════════════

DROP POLICY IF EXISTS "Players insert own reviews" ON public.reviews;
CREATE POLICY "Players insert own reviews" ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM public.session_attendance sa
      JOIN public.training_sessions ts ON ts.id = sa.session_id
      JOIN public.trainings t ON t.id = ts.training_id
      WHERE sa.user_id = auth.uid()
        AND t.coach_id = reviews.coach_id
        AND sa.status = 'confirmed'
        AND ts.session_date <= CURRENT_DATE
    )
  );

-- ═══════════════════════════════════════════════════
-- 3a. can_review_coach — eligibility check for the UI
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_review_coach(p_coach_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM session_attendance sa
    JOIN training_sessions ts ON ts.id = sa.session_id
    JOIN trainings t ON t.id = ts.training_id
    WHERE sa.user_id = auth.uid()
      AND t.coach_id = p_coach_id
      AND sa.status = 'confirmed'
      AND ts.session_date <= CURRENT_DATE
  ) AND NOT EXISTS (
    SELECT 1 FROM reviews
    WHERE reviewer_id = auth.uid()
      AND coach_id = p_coach_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_review_coach(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════
-- 3b. get_school_reviews — aggregate reviews from every
--     approved coach plus the school owner
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_school_reviews(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  text TEXT,
  coach_response TEXT,
  reviewer_id UUID,
  reviewer_name TEXT,
  reviewer_avatar_url TEXT,
  coach_id UUID,
  coach_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.rating,
    r.text,
    r.coach_response,
    r.reviewer_id,
    rp.full_name        AS reviewer_name,
    rp.avatar_url       AS reviewer_avatar_url,
    r.coach_id,
    cp.full_name        AS coach_name,
    r.created_at
  FROM reviews r
  LEFT JOIN profiles rp ON rp.id = r.reviewer_id
  LEFT JOIN profiles cp ON cp.id = r.coach_id
  WHERE r.coach_id IN (
    SELECT s.owner_id FROM schools s WHERE s.id = p_school_id
    UNION
    SELECT sm.coach_id FROM school_members sm
    WHERE sm.school_id = p_school_id AND sm.status = 'approved'
  )
  ORDER BY r.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_school_reviews(UUID) TO anon, authenticated;

-- ═══════════════════════════════════════════════════
-- 4. delete_my_account — refreshed to wipe favourite_coaches
--    Body copied from 20260413200000 (the latest version)
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
  DELETE FROM public.favourite_coaches WHERE user_id = v_uid OR coach_id = v_uid;
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
