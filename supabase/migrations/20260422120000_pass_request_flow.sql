-- Pass request flow: allow players to request passes (status='pending'),
-- coaches/owners approve or decline.

-- A) Widen status CHECK to include 'pending'
ALTER TABLE public.player_abonaments DROP CONSTRAINT player_abonaments_status_check;
ALTER TABLE public.player_abonaments ADD CONSTRAINT player_abonaments_status_check
  CHECK (status IN ('pending', 'active', 'used_up', 'expired'));

-- B) Tighten INSERT RLS: players can only insert status='pending',
--    coaches/owners can insert any status (direct assignment).
DROP POLICY IF EXISTS "player_abonaments_insert" ON public.player_abonaments;
CREATE POLICY "player_abonaments_insert" ON public.player_abonaments
  FOR INSERT TO authenticated
  WITH CHECK (
    (player_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = player_abonaments.school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  );

-- C) Add DELETE policy: player can cancel own pending request,
--    owner and coaches can decline (delete) pending requests.
DROP POLICY IF EXISTS "player_abonaments_delete" ON public.player_abonaments;
CREATE POLICY "player_abonaments_delete" ON public.player_abonaments
  FOR DELETE TO authenticated
  USING (
    (player_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = player_abonaments.school_id AND sm.coach_id = auth.uid() AND sm.status = 'approved')
  );
