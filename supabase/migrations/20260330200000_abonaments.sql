-- Abonament (class pass) system
-- Coach defines pass types per training, players buy them, coach marks attendance to deduct sessions.

-- ── Tables ──

CREATE TABLE public.abonament_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sessions_count INTEGER NOT NULL CHECK (sessions_count > 0),
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'PLN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.player_abonaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abonament_type_id UUID NOT NULL REFERENCES public.abonament_types(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
  sessions_remaining INTEGER NOT NULL CHECK (sessions_remaining >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'used_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE TABLE public.abonament_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_abonament_id UUID NOT NULL REFERENCES public.player_abonaments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_abonament_id, session_id)
);

-- Indexes
CREATE INDEX idx_abonament_types_training ON public.abonament_types(training_id) WHERE is_active = true;
CREATE INDEX idx_player_abonaments_training ON public.player_abonaments(training_id);
CREATE INDEX idx_player_abonaments_player ON public.player_abonaments(player_id);
CREATE INDEX idx_abonament_usage_abonament ON public.abonament_usage(player_abonament_id);
CREATE INDEX idx_abonament_usage_session ON public.abonament_usage(session_id);

-- ── RLS ──

ALTER TABLE public.abonament_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_abonaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonament_usage ENABLE ROW LEVEL SECURITY;

-- abonament_types: anyone authenticated can read (players need to see available passes)
CREATE POLICY "abonament_types_select" ON public.abonament_types
  FOR SELECT TO authenticated USING (true);

-- abonament_types: coach who owns the training can manage
CREATE POLICY "abonament_types_insert" ON public.abonament_types
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "abonament_types_update" ON public.abonament_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "abonament_types_delete" ON public.abonament_types
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- player_abonaments: player sees own, coach sees their training's
CREATE POLICY "player_abonaments_select" ON public.player_abonaments
  FOR SELECT TO authenticated
  USING (
    player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- player_abonaments: player can request (insert with status='pending')
CREATE POLICY "player_abonaments_insert" ON public.player_abonaments
  FOR INSERT TO authenticated
  WITH CHECK (player_id = auth.uid() AND status = 'pending');

-- player_abonaments: coach can update (activate, etc.)
CREATE POLICY "player_abonaments_update" ON public.player_abonaments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

-- abonament_usage: visible to player + coach
CREATE POLICY "abonament_usage_select" ON public.abonament_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.player_abonaments pa WHERE pa.id = player_abonament_id AND pa.player_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.player_abonaments pa
      JOIN public.trainings t ON t.id = pa.training_id
      WHERE pa.id = player_abonament_id AND t.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.player_abonaments pa
      JOIN public.trainings t ON t.id = pa.training_id
      JOIN public.schools s ON s.id = t.school_id
      WHERE pa.id = player_abonament_id AND s.owner_id = auth.uid()
    )
  );

-- Usage insert/delete goes through RPC (SECURITY DEFINER) for atomicity

-- ── RPC: Atomic deduction ──

CREATE OR REPLACE FUNCTION public.deduct_abonament_session(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_training_id UUID;
  v_coach_id UUID;
  v_school_owner_id UUID;
BEGIN
  -- Verify caller is the coach or school owner
  SELECT pa.sessions_remaining, pa.training_id, t.coach_id,
         (SELECT s.owner_id FROM schools s WHERE s.id = t.school_id)
  INTO v_remaining, v_training_id, v_coach_id, v_school_owner_id
  FROM player_abonaments pa
  JOIN trainings t ON t.id = pa.training_id
  WHERE pa.id = p_player_abonament_id
  FOR UPDATE OF pa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Abonament not found';
  END IF;

  IF auth.uid() != v_coach_id AND (v_school_owner_id IS NULL OR auth.uid() != v_school_owner_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check if already deducted for this session
  IF EXISTS (
    SELECT 1 FROM abonament_usage
    WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Already deducted for this session';
  END IF;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'No sessions remaining';
  END IF;

  -- Insert usage record
  INSERT INTO abonament_usage (player_abonament_id, session_id)
  VALUES (p_player_abonament_id, p_session_id);

  -- Decrement remaining
  UPDATE player_abonaments
  SET sessions_remaining = v_remaining - 1,
      status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
  WHERE id = p_player_abonament_id;
END;
$$;

-- ── RPC: Undo deduction ──

CREATE OR REPLACE FUNCTION public.undo_abonament_deduction(
  p_player_abonament_id UUID,
  p_session_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_training_id UUID;
  v_coach_id UUID;
  v_school_owner_id UUID;
BEGIN
  -- Verify caller is the coach or school owner
  SELECT pa.training_id, t.coach_id,
         (SELECT s.owner_id FROM schools s WHERE s.id = t.school_id)
  INTO v_training_id, v_coach_id, v_school_owner_id
  FROM player_abonaments pa
  JOIN trainings t ON t.id = pa.training_id
  WHERE pa.id = p_player_abonament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Abonament not found';
  END IF;

  IF auth.uid() != v_coach_id AND (v_school_owner_id IS NULL OR auth.uid() != v_school_owner_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Remove usage record
  DELETE FROM abonament_usage
  WHERE player_abonament_id = p_player_abonament_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No usage record found for this session';
  END IF;

  -- Increment remaining and restore status
  UPDATE player_abonaments
  SET sessions_remaining = sessions_remaining + 1,
      status = 'active'
  WHERE id = p_player_abonament_id;
END;
$$;
