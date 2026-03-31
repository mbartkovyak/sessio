-- Abonaments v3: timed passes, direct assignment by coach, nullable sessions.
-- Tables have no production data — safe to alter constraints freely.

-- ── Drop all CHECK constraints so we can re-define them ──
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'player_abonaments'::regclass AND contype = 'c' LOOP
    EXECUTE 'ALTER TABLE public.player_abonaments DROP CONSTRAINT ' || r.conname;
  END LOOP;
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'abonament_types'::regclass AND contype = 'c' LOOP
    EXECUTE 'ALTER TABLE public.abonament_types DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

-- ── abonament_types: add duration, make sessions optional ──
ALTER TABLE public.abonament_types ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE public.abonament_types ALTER COLUMN sessions_count DROP NOT NULL;
-- Must have at least one limit
ALTER TABLE public.abonament_types ADD CONSTRAINT abonament_types_has_limit
  CHECK (sessions_count IS NOT NULL OR duration_days IS NOT NULL);
ALTER TABLE public.abonament_types ADD CONSTRAINT abonament_types_sessions_positive
  CHECK (sessions_count IS NULL OR sessions_count > 0);
ALTER TABLE public.abonament_types ADD CONSTRAINT abonament_types_duration_positive
  CHECK (duration_days IS NULL OR duration_days > 0);

-- ── player_abonaments: add expires_at, nullable sessions, new statuses ──
ALTER TABLE public.player_abonaments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.player_abonaments ALTER COLUMN sessions_total DROP NOT NULL;
ALTER TABLE public.player_abonaments ALTER COLUMN sessions_remaining DROP NOT NULL;
ALTER TABLE public.player_abonaments ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.player_abonaments ADD CONSTRAINT player_abonaments_status_check
  CHECK (status IN ('active', 'used_up', 'expired'));
ALTER TABLE public.player_abonaments ADD CONSTRAINT player_abonaments_sessions_remaining_check
  CHECK (sessions_remaining IS NULL OR sessions_remaining >= 0);
ALTER TABLE public.player_abonaments ADD CONSTRAINT player_abonaments_sessions_total_check
  CHECK (sessions_total IS NULL OR sessions_total > 0);

-- Update any 'pending' rows to 'active' (shouldn't exist, but be safe)
UPDATE public.player_abonaments SET status = 'active', activated_at = now() WHERE status = 'pending';

-- ── RLS: allow coach/owner to INSERT (assign) player_abonaments directly ──
DROP POLICY IF EXISTS "player_abonaments_insert" ON public.player_abonaments;
CREATE POLICY "player_abonaments_insert" ON public.player_abonaments
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = player_abonaments.school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  );

-- ── RPCs: update to handle timed passes + nullable sessions ──
DROP FUNCTION IF EXISTS public.deduct_abonament_session(UUID, UUID);
CREATE OR REPLACE FUNCTION public.deduct_abonament_session(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_school_id UUID;
  v_school_owner_id UUID;
BEGIN
  SELECT pa.sessions_remaining, pa.expires_at, pa.school_id, s.owner_id
  INTO v_remaining, v_expires_at, v_school_id, v_school_owner_id
  FROM player_abonaments pa
  JOIN schools s ON s.id = pa.school_id
  WHERE pa.id = p_player_abonament_id AND pa.status = 'active'
  FOR UPDATE OF pa;

  IF NOT FOUND THEN RAISE EXCEPTION 'Abonament not found or not active'; END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    UPDATE player_abonaments SET status = 'expired' WHERE id = p_player_abonament_id;
    RAISE EXCEPTION 'Abonament has expired';
  END IF;

  IF auth.uid() != v_school_owner_id
    AND NOT EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = v_school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF EXISTS (SELECT 1 FROM abonament_usage WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id) THEN
    RAISE EXCEPTION 'Already deducted for this session';
  END IF;

  IF v_remaining IS NOT NULL AND v_remaining <= 0 THEN
    RAISE EXCEPTION 'No sessions remaining';
  END IF;

  INSERT INTO abonament_usage (player_abonament_id, session_id) VALUES (p_player_abonament_id, p_session_id);

  IF v_remaining IS NOT NULL THEN
    UPDATE player_abonaments
    SET sessions_remaining = v_remaining - 1,
        status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
    WHERE id = p_player_abonament_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.undo_abonament_deduction(UUID, UUID);
CREATE OR REPLACE FUNCTION public.undo_abonament_deduction(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_school_owner_id UUID;
  v_sessions_total INTEGER;
BEGIN
  SELECT pa.school_id, s.owner_id, pa.sessions_total
  INTO v_school_id, v_school_owner_id, v_sessions_total
  FROM player_abonaments pa
  JOIN schools s ON s.id = pa.school_id
  WHERE pa.id = p_player_abonament_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Abonament not found'; END IF;

  IF auth.uid() != v_school_owner_id
    AND NOT EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = v_school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM abonament_usage WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No usage record found for this session'; END IF;

  IF v_sessions_total IS NOT NULL THEN
    UPDATE player_abonaments SET sessions_remaining = sessions_remaining + 1, status = 'active' WHERE id = p_player_abonament_id;
  ELSE
    UPDATE player_abonaments SET status = 'active' WHERE id = p_player_abonament_id;
  END IF;
END;
$$;
