-- Switch abonaments from training-wide to school-wide.
-- Tables were just created and have no production data.

-- Drop existing RPCs
DROP FUNCTION IF EXISTS public.deduct_abonament_session(UUID, UUID);
DROP FUNCTION IF EXISTS public.undo_abonament_deduction(UUID, UUID);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "abonament_types_select" ON public.abonament_types;
DROP POLICY IF EXISTS "abonament_types_insert" ON public.abonament_types;
DROP POLICY IF EXISTS "abonament_types_update" ON public.abonament_types;
DROP POLICY IF EXISTS "abonament_types_delete" ON public.abonament_types;
DROP POLICY IF EXISTS "player_abonaments_select" ON public.player_abonaments;
DROP POLICY IF EXISTS "player_abonaments_insert" ON public.player_abonaments;
DROP POLICY IF EXISTS "player_abonaments_update" ON public.player_abonaments;
DROP POLICY IF EXISTS "abonament_usage_select" ON public.abonament_usage;

-- Drop old indexes
DROP INDEX IF EXISTS idx_abonament_types_training;
DROP INDEX IF EXISTS idx_player_abonaments_training;

-- Swap training_id → school_id on abonament_types
ALTER TABLE public.abonament_types DROP COLUMN training_id;
ALTER TABLE public.abonament_types ADD COLUMN school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Swap training_id → school_id on player_abonaments
ALTER TABLE public.player_abonaments DROP COLUMN training_id;
ALTER TABLE public.player_abonaments ADD COLUMN school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- New indexes
CREATE INDEX idx_abonament_types_school ON public.abonament_types(school_id) WHERE is_active = true;
CREATE INDEX idx_player_abonaments_school ON public.player_abonaments(school_id);

-- ── RLS ──

-- abonament_types: anyone auth can read; school owner can manage
CREATE POLICY "abonament_types_select" ON public.abonament_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "abonament_types_insert" ON public.abonament_types
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid()));

CREATE POLICY "abonament_types_update" ON public.abonament_types
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid()));

CREATE POLICY "abonament_types_delete" ON public.abonament_types
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid()));

-- player_abonaments: player sees own; school owner + school coaches see theirs
CREATE POLICY "player_abonaments_select" ON public.player_abonaments
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = player_abonaments.school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  );

CREATE POLICY "player_abonaments_insert" ON public.player_abonaments
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid() AND status = 'pending');

CREATE POLICY "player_abonaments_update" ON public.player_abonaments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
  );

-- abonament_usage: player + school owner + school coaches can see
CREATE POLICY "abonament_usage_select" ON public.abonament_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.player_abonaments pa WHERE pa.id = player_abonament_id AND pa.player_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.player_abonaments pa
      JOIN public.schools s ON s.id = pa.school_id
      WHERE pa.id = player_abonament_id AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.player_abonaments pa
      JOIN public.school_members sm ON sm.school_id = pa.school_id
      WHERE pa.id = player_abonament_id AND sm.coach_id = auth.uid() AND sm.status = 'approved'
    )
  );

-- ── RPCs ──

CREATE OR REPLACE FUNCTION public.deduct_abonament_session(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_school_id UUID;
  v_school_owner_id UUID;
BEGIN
  SELECT pa.sessions_remaining, pa.school_id, s.owner_id
  INTO v_remaining, v_school_id, v_school_owner_id
  FROM player_abonaments pa
  JOIN schools s ON s.id = pa.school_id
  WHERE pa.id = p_player_abonament_id
  FOR UPDATE OF pa;

  IF NOT FOUND THEN RAISE EXCEPTION 'Abonament not found'; END IF;

  -- Caller must be school owner or an approved coach in the school
  IF auth.uid() != v_school_owner_id
    AND NOT EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = v_school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF EXISTS (SELECT 1 FROM abonament_usage WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id) THEN
    RAISE EXCEPTION 'Already deducted for this session';
  END IF;

  IF v_remaining <= 0 THEN RAISE EXCEPTION 'No sessions remaining'; END IF;

  INSERT INTO abonament_usage (player_abonament_id, session_id) VALUES (p_player_abonament_id, p_session_id);

  UPDATE player_abonaments
  SET sessions_remaining = v_remaining - 1,
      status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
  WHERE id = p_player_abonament_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_abonament_deduction(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_school_owner_id UUID;
BEGIN
  SELECT pa.school_id, s.owner_id
  INTO v_school_id, v_school_owner_id
  FROM player_abonaments pa
  JOIN schools s ON s.id = pa.school_id
  WHERE pa.id = p_player_abonament_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Abonament not found'; END IF;

  IF auth.uid() != v_school_owner_id
    AND NOT EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = v_school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM abonament_usage WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No usage record found for this session'; END IF;

  UPDATE player_abonaments SET sessions_remaining = sessions_remaining + 1, status = 'active' WHERE id = p_player_abonament_id;
END;
$$;
