-- Per-coach pass pricing + training-attached required pass.
--
-- Why:
--   - Today abonament_types is school-wide; every coach in a school shares prices.
--     A real tennis school has different rates per coach.
--   - A training currently has no concept of a required pass. We want coaches to
--     optionally gate a training behind a specific pass type, with the pass
--     request routed to *that* coach (not all school staff).
--
-- What changes here:
--   1. abonament_types gains nullable coach_id (NULL = legacy school-wide).
--   2. trainings gains required_pass_type_id (NULL = no pass required).
--   3. player_abonaments gains requesting_coach_id + requested_for_training_id
--      so a request originating from a training join carries that context.
--   4. RLS: coaches can manage their own pass types; training-originated
--      pass requests can only be approved by the routed coach (or the school owner).
--
-- Existing rows are unaffected: legacy passes have coach_id = NULL and keep
-- their existing approve-by-any-school-coach behaviour. New per-coach passes
-- and training-originated requests use the new tightened RLS path.

-- ── 1. abonament_types: per-coach attribution ────────────────────────────
ALTER TABLE public.abonament_types
  ADD COLUMN IF NOT EXISTS coach_id UUID NULL
    REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_abonament_types_coach_id
  ON public.abonament_types(coach_id)
  WHERE coach_id IS NOT NULL;

-- ── 2. trainings: optional required pass ─────────────────────────────────
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS required_pass_type_id UUID NULL
    REFERENCES public.abonament_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trainings_required_pass_type_id
  ON public.trainings(required_pass_type_id)
  WHERE required_pass_type_id IS NOT NULL;

-- ── 3. player_abonaments: request routing context ────────────────────────
ALTER TABLE public.player_abonaments
  ADD COLUMN IF NOT EXISTS requesting_coach_id UUID NULL
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.player_abonaments
  ADD COLUMN IF NOT EXISTS requested_for_training_id UUID NULL
    REFERENCES public.trainings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_player_abonaments_requesting_coach
  ON public.player_abonaments(requesting_coach_id)
  WHERE requesting_coach_id IS NOT NULL;

-- ── 4a. RLS: abonament_types — coaches manage their own ──────────────────
DROP POLICY IF EXISTS "abonament_types_insert" ON public.abonament_types;
CREATE POLICY "abonament_types_insert" ON public.abonament_types
  FOR INSERT TO authenticated
  WITH CHECK (
    -- School owner can create any pass for their school
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = abonament_types.school_id
        AND s.owner_id = auth.uid()
    )
    -- Approved coach can create their OWN per-coach passes (coach_id must = themselves)
    OR (
      abonament_types.coach_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = abonament_types.school_id
          AND sm.coach_id = auth.uid()
          AND sm.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "abonament_types_update" ON public.abonament_types;
CREATE POLICY "abonament_types_update" ON public.abonament_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = abonament_types.school_id
        AND s.owner_id = auth.uid()
    )
    OR abonament_types.coach_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = abonament_types.school_id
        AND s.owner_id = auth.uid()
    )
    OR abonament_types.coach_id = auth.uid()
  );

DROP POLICY IF EXISTS "abonament_types_delete" ON public.abonament_types;
CREATE POLICY "abonament_types_delete" ON public.abonament_types
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = abonament_types.school_id
        AND s.owner_id = auth.uid()
    )
    OR abonament_types.coach_id = auth.uid()
  );

-- ── 4b. RLS: player_abonaments — route training-originated approvals ─────
-- Training-originated request → only the routed coach OR school owner can approve.
-- Browse-originated request (no coach context) → school owner OR any approved coach
-- (this also fixes the previous owner-only state that prevented coaches from
-- approving browse-flow requests at all).
DROP POLICY IF EXISTS "player_abonaments_update" ON public.player_abonaments;
CREATE POLICY "player_abonaments_update" ON public.player_abonaments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = player_abonaments.school_id
        AND s.owner_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NOT NULL
      AND requesting_coach_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = player_abonaments.school_id
          AND sm.coach_id = auth.uid()
          AND sm.status = 'approved'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = player_abonaments.school_id
        AND s.owner_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NOT NULL
      AND requesting_coach_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = player_abonaments.school_id
          AND sm.coach_id = auth.uid()
          AND sm.status = 'approved'
      )
    )
  );

-- Same routing for DELETE: a coach can decline only requests routed to them.
DROP POLICY IF EXISTS "player_abonaments_delete" ON public.player_abonaments;
CREATE POLICY "player_abonaments_delete" ON public.player_abonaments
  FOR DELETE TO authenticated
  USING (
    -- Player can cancel own pending request
    (player_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = player_abonaments.school_id
        AND s.owner_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NOT NULL
      AND requesting_coach_id = auth.uid()
    )
    OR (
      requesting_coach_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.school_members sm
        WHERE sm.school_id = player_abonaments.school_id
          AND sm.coach_id = auth.uid()
          AND sm.status = 'approved'
      )
    )
  );

-- ── 5. Service-role grants (CLAUDE.md rule 2) ────────────────────────────
GRANT ALL ON TABLE public.abonament_types TO service_role;
GRANT ALL ON TABLE public.player_abonaments TO service_role;
GRANT ALL ON TABLE public.trainings TO service_role;

-- delete_my_account: existing function already wipes player_abonaments
-- (player_id cascade) and FKs use ON DELETE SET NULL/CASCADE for the new
-- columns, so no function rewrite is needed. Verified against latest version
-- in 20260428130000_save_coach_reviews_revamp.sql.
