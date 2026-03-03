
-- Fix claim_spot: verify caller is the player and is a group member
CREATE OR REPLACE FUNCTION public.claim_spot(p_spot_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot open_spots%ROWTYPE;
  v_is_member boolean;
BEGIN
  -- Validate caller is the player claiming
  IF auth.uid() IS DISTINCT FROM p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock the row to prevent race conditions
  SELECT * INTO v_spot FROM open_spots WHERE id = p_spot_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
  END IF;

  -- Verify player is a member of this group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_spot.group_id
      AND player_id = p_player_id
      AND status IN ('active', 'waitlist', 'flex')
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this group');
  END IF;

  IF v_spot.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- Mark as claimed
  UPDATE open_spots
  SET status = 'claimed', claimed_by = p_player_id, claimed_at = now()
  WHERE id = p_spot_id;

  -- Upsert confirmation as confirmed
  INSERT INTO confirmations (session_id, player_id, status, responded_at)
  VALUES (v_spot.session_id, p_player_id, 'confirmed', now())
  ON CONFLICT (session_id, player_id) DO UPDATE
    SET status = 'confirmed', responded_at = now();

  RETURN jsonb_build_object('success', true, 'session_id', v_spot.session_id, 'group_id', v_spot.group_id);
END;
$$;

-- Fix generate_sessions_for_group: allow only the group's coach (or service role via edge function)
CREATE OR REPLACE FUNCTION public.generate_sessions_for_group(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group groups%ROWTYPE;
  v_target_date date;
  v_today date := current_date;
  v_end_date date := current_date + 14;
  v_session_id uuid;
  v_created_count integer := 0;
BEGIN
  SELECT * INTO v_group FROM groups WHERE id = p_group_id;
  IF NOT FOUND OR NOT v_group.is_active THEN
    RETURN jsonb_build_object('created', 0);
  END IF;

  -- Allow only the coach of this group or service_role (cron/edge function)
  IF auth.uid() IS NOT NULL AND auth.uid() != v_group.coach_id THEN
    RETURN jsonb_build_object('created', 0, 'error', 'Unauthorized - not group coach');
  END IF;

  v_target_date := v_today + ((v_group.day_of_week + 1 - EXTRACT(DOW FROM v_today)::integer + 7) % 7);

  WHILE v_target_date <= v_end_date LOOP
    IF NOT EXISTS (
      SELECT 1 FROM sessions
      WHERE group_id = p_group_id AND session_date = v_target_date
    ) THEN
      INSERT INTO sessions (group_id, session_date, start_time, end_time, status)
      VALUES (p_group_id, v_target_date, v_group.start_time, v_group.end_time, 'scheduled')
      RETURNING id INTO v_session_id;

      INSERT INTO confirmations (session_id, player_id, status)
      SELECT v_session_id, gm.player_id, 'pending'
      FROM group_members gm
      WHERE gm.group_id = p_group_id AND gm.status = 'active'
      ON CONFLICT (session_id, player_id) DO NOTHING;

      v_created_count := v_created_count + 1;
    END IF;

    v_target_date := v_target_date + 7;
  END LOOP;

  RETURN jsonb_build_object('created', v_created_count);
END;
$$;
