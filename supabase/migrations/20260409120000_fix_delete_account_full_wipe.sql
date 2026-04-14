-- Fix delete_my_account: fully delete the auth.users row instead of just
-- nullifying the profiles row. This ensures re-registration with the same
-- email starts completely fresh (no orphaned profile, no old data).
--
-- The auth.users deletion cascades to profiles (ON DELETE CASCADE), which
-- in turn cascades to all tables referencing profiles(id). All active FKs
-- have ON DELETE CASCADE or ON DELETE SET NULL — verified in migration
-- 20260313190000_fix_fkeys_to_profiles.sql.
--
-- Explicit DELETEs above the auth.users delete are retained because:
-- (a) Coach-owned trainings have deep cascading chains (messages →
--     conversation_participants → conversations → sessions → members)
--     that must be cleaned in the correct order.
-- (b) Belt-and-suspenders: explicit cleanup ensures no data survives even
--     if a future migration adds a table without CASCADE.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- ── Coach-owned training cascade ──────────────────────────────────────
  -- Must delete children before parents due to FK ordering.
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
  -- abonament_types + player_abonaments + abonament_usage cascade from trainings deletion
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

  -- ── Storage files: cleaned up client-side via Storage API before this RPC call.
  -- Direct DELETE from storage.objects is blocked by Supabase.

  -- ── Orphaned DM conversations (no participants left) ──────────────────
  DELETE FROM public.conversations c
  WHERE c.training_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    );

  -- ── Delete the auth user ──────────────────────────────────────────────
  -- Cascades to: profiles (ON DELETE CASCADE) → and through profiles to
  -- all remaining tables with ON DELETE CASCADE/SET NULL.
  -- This is the nuclear option — anything the explicit DELETEs above
  -- missed will be caught by the cascade chain.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;
