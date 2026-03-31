-- Fix delete_my_account: remove full_name from UPDATE (it's now a GENERATED ALWAYS column),
-- and add cleanup for abonament tables added since last update.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Coach-owned training cascade
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

  -- User participation data
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

  -- Player abonaments (for trainings owned by other coaches)
  DELETE FROM public.player_abonaments WHERE player_id = v_uid;

  -- School data
  DELETE FROM public.school_members WHERE coach_id = v_uid;
  DELETE FROM public.schools WHERE owner_id = v_uid;

  -- Reset profile (all user-settable columns)
  -- full_name is GENERATED ALWAYS — do NOT set it explicitly
  UPDATE public.profiles
  SET role = NULL, onboarding_complete = false, sport = NULL, city = NULL, country = NULL, bio = NULL,
      school_id = NULL, first_name = NULL, last_name = NULL,
      phone = NULL, avatar_url = NULL, venues = '[]'::jsonb, language = NULL
  WHERE id = v_uid;
END;
$$;
