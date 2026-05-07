-- Capacity guardrails + forensic audit.
--
-- Closes the remaining capacity-bypass paths after 20260505230000:
--   1. Player re-confirm via useUpsertAttendance had a client-side count gated
--      by RLS — the SELECT count was stripped to the player's own row, so the
--      check `count >= max_players` always evaluated `0 >= 8` and passed.
--      That's how the 9/8 overbook on the «ДОДО» 2026-05-05 session happened.
--   2. create_attendance_for_new_member trigger inserts 'confirmed' for every
--      upcoming session with no per-session capacity check. A new regular can
--      silently push a session past max_players if drop-ins already filled it.
--   3. join_single_session had the right check but no FOR UPDATE on the
--      training row → small race window.
--
-- Layered fix (statements ordered so each layer is safe before the next):
--   • session_attendance_log + AFTER trigger (forensic record).
--   • create_attendance_for_new_member: smart-route per session — 'confirmed'
--     if room, 'pending' if full. Avoids the BEFORE trigger killing
--     training_members inserts when some sessions are full.
--   • join_single_session: tighten with FOR UPDATE OF t.
--   • confirm_session_attendance / decline_session_attendance RPCs.
--   • enforce_session_capacity BEFORE trigger — the hard backstop. Last so
--     all earlier paths are already safe before it goes live.
--   • delete_my_account: wipe session_attendance_log for the deleted user.

-- ── 1. session_attendance_log table + audit trigger ───────────────────

CREATE TABLE IF NOT EXISTS public.session_attendance_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor UUID,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  op TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_sa_log_session_at ON public.session_attendance_log(session_id, at);
CREATE INDEX IF NOT EXISTS idx_sa_log_user_at ON public.session_attendance_log(user_id, at);

GRANT ALL ON TABLE public.session_attendance_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.session_attendance_log_id_seq TO service_role;
GRANT SELECT ON TABLE public.session_attendance_log TO authenticated;

ALTER TABLE public.session_attendance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches view their training logs" ON public.session_attendance_log;
CREATE POLICY "Coaches view their training logs" ON public.session_attendance_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.trainings t ON t.id = ts.training_id
      WHERE ts.id = session_attendance_log.session_id
        AND (
          t.coach_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id AND s.owner_id = auth.uid())
        )
    )
  );

CREATE OR REPLACE FUNCTION public.log_session_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.session_attendance_log
    (actor, session_id, user_id, op, old_status, new_status)
  VALUES (
    auth.uid(),
    COALESCE(NEW.session_id, OLD.session_id),
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    OLD.status,
    NEW.status
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_session_attendance ON public.session_attendance;
CREATE TRIGGER trg_log_session_attendance
AFTER INSERT OR UPDATE OR DELETE ON public.session_attendance
FOR EACH ROW EXECUTE FUNCTION public.log_session_attendance_change();

-- ── 2. create_attendance_for_new_member: smart per-session routing ────
-- Body copied from current state (20260401240000) and patched in-place per
-- CLAUDE.md "copy current body, not stale" rule.

CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role <> 'regular' THEN RETURN NEW; END IF;

  -- Acquire the same lock the BEFORE trigger uses, so the count we see is stable.
  PERFORM 1 FROM public.trainings WHERE id = NEW.training_id FOR UPDATE;

  INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
  SELECT ts.id, NEW.user_id,
         CASE WHEN COALESCE(c.cnt, 0) < COALESCE(t.max_players, 2147483647)
              THEN 'confirmed' ELSE 'pending' END,
         CASE WHEN COALESCE(c.cnt, 0) < COALESCE(t.max_players, 2147483647)
              THEN now() ELSE NULL END
  FROM public.training_sessions ts
  JOIN public.trainings t ON t.id = ts.training_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.session_attendance sa
    WHERE sa.session_id = ts.id AND sa.status = 'confirmed'
  ) c ON true
  WHERE ts.training_id = NEW.training_id
    AND ts.session_date >= CURRENT_DATE
    AND ts.status = 'scheduled'
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── 3. join_single_session: tighten with FOR UPDATE on the training row ─
-- Body copied from current state (20260430120100) and patched in-place.

CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_players INTEGER;
  v_confirmed INTEGER;
  v_required_pass_type_id UUID;
  v_session_date DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch session + training context AND lock the training row to serialize.
  SELECT t.max_players, t.required_pass_type_id, ts.session_date
    INTO v_max_players, v_required_pass_type_id, v_session_date
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
    AND ts.status = 'scheduled'
    AND t.is_active = true
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or cancelled';
  END IF;

  IF v_required_pass_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM player_abonaments pa
      WHERE pa.player_id = v_user_id
        AND pa.abonament_type_id = v_required_pass_type_id
        AND pa.status = 'active'
        AND pa.activated_at::date <= v_session_date
        AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_session_date)
        AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
    ) THEN
      RAISE EXCEPTION 'PASS_REQUIRED';
    END IF;
  END IF;

  IF v_max_players IS NOT NULL THEN
    SELECT count(*) INTO v_confirmed
    FROM session_attendance
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_max_players THEN
      RAISE EXCEPTION 'Session is full';
    END IF;
  END IF;

  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (p_session_id, v_user_id, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$;

-- ── 4. Player-side confirm/decline RPCs ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_session_attendance(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_existing TEXT;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status INTO v_existing
  FROM session_attendance
  WHERE session_id = p_session_id AND user_id = v_user;

  -- Idempotent: already confirmed → no-op (don't bump confirmed_at, no audit churn).
  IF v_existing = 'confirmed' THEN
    RETURN;
  END IF;

  -- The BEFORE INSERT/UPDATE trigger enforces capacity; this function just writes.
  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (p_session_id, v_user, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO UPDATE
    SET status = 'confirmed',
        confirmed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_session_attendance(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_session_attendance(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO session_attendance (session_id, user_id, status, declined_at)
  VALUES (p_session_id, v_user, 'declined', now())
  ON CONFLICT (session_id, user_id) DO UPDATE
    SET status = 'declined',
        declined_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_session_attendance(UUID) TO authenticated;

-- ── 5. enforce_session_capacity: BEFORE trigger, the hard backstop ────
-- Attached LAST so every other path is already safe.

CREATE OR REPLACE FUNCTION public.enforce_session_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_session_status TEXT;
  v_count INTEGER;
BEGIN
  -- Only act when the row is becoming/staying 'confirmed'.
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Idempotent confirmed_at refresh on the same row → count unchanged.
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'confirmed'
     AND OLD.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Lock the parent training to serialize concurrent capacity-affecting writes.
  SELECT t.max_players, ts.status
    INTO v_max, v_session_status
  FROM public.training_sessions ts
  JOIN public.trainings t ON t.id = ts.training_id
  WHERE ts.id = NEW.session_id
  FOR UPDATE OF t;

  -- No cap configured, or session not currently scheduled → nothing to enforce.
  IF v_max IS NULL OR v_session_status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.session_attendance
  WHERE session_id = NEW.session_id AND status = 'confirmed';

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'SESSION_FULL: session % at capacity (%/%)',
      NEW.session_id, v_count, v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_session_capacity ON public.session_attendance;
CREATE TRIGGER trg_enforce_session_capacity
BEFORE INSERT OR UPDATE ON public.session_attendance
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_capacity();

-- ── 6. delete_my_account: wipe session_attendance_log for the user ────
-- Body copied from current state (20260428130000) per CLAUDE.md rule #1.

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
  DELETE FROM public.session_attendance_log WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  DELETE FROM public.session_attendance WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  DELETE FROM public.training_sessions WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_members WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.join_requests WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.trainings WHERE coach_id = v_uid;

  -- ── User participation data ───────────────────────────────────────────
  DELETE FROM public.messages WHERE sender_id = v_uid;
  DELETE FROM public.conversation_participants WHERE user_id = v_uid;
  DELETE FROM public.message_reactions WHERE user_id = v_uid;
  DELETE FROM public.session_attendance_log WHERE user_id = v_uid OR actor = v_uid;
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
