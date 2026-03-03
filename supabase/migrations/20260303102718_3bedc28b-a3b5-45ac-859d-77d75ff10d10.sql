
-- ================================================================
-- FUNCTION: claim_spot (atomic, race-condition safe)
-- ================================================================
CREATE OR REPLACE FUNCTION public.claim_spot(p_spot_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot open_spots%ROWTYPE;
  v_session_id uuid;
  v_group_id uuid;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_spot FROM open_spots WHERE id = p_spot_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spot not found');
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

-- ================================================================
-- FUNCTION: generate_sessions_for_group
-- Generates up to 2 weeks of sessions, skips existing ones
-- ================================================================
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
  v_player record;
BEGIN
  SELECT * INTO v_group FROM groups WHERE id = p_group_id;
  IF NOT FOUND OR NOT v_group.is_active THEN
    RETURN jsonb_build_object('created', 0);
  END IF;

  -- Find the first occurrence of day_of_week from today
  -- day_of_week: 0=Mon ... 6=Sun; dow in postgres: 0=Sun ... 6=Sat
  -- Convert: our Mon=0 maps to dow=2, Tue=1 => dow=3, ... Sun=6 => dow=1
  v_target_date := v_today + ((v_group.day_of_week + 1 - EXTRACT(DOW FROM v_today)::integer + 7) % 7);

  WHILE v_target_date <= v_end_date LOOP
    -- Skip if session already exists for this date+group
    IF NOT EXISTS (
      SELECT 1 FROM sessions
      WHERE group_id = p_group_id AND session_date = v_target_date
    ) THEN
      -- Create session
      INSERT INTO sessions (group_id, session_date, start_time, end_time, status)
      VALUES (p_group_id, v_target_date, v_group.start_time, v_group.end_time, 'scheduled')
      RETURNING id INTO v_session_id;

      -- Create pending confirmations for all active members
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

-- ================================================================
-- FUNCTION: process_confirmation_window
-- For sessions entering the confirmation window, create notifications
-- ================================================================
CREATE OR REPLACE FUNCTION public.process_confirmation_window()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_conf record;
  v_group groups%ROWTYPE;
  v_notifications_sent integer := 0;
  v_day_name text;
BEGIN
  -- Find sessions where we're within the confirmation window
  -- and haven't notified the player yet (notification doesn't exist)
  FOR v_session IN
    SELECT s.*, g.confirmation_deadline_hours, g.name as group_name, g.start_time as group_start
    FROM sessions s
    JOIN groups g ON s.group_id = g.id
    WHERE s.status = 'scheduled'
      AND s.session_date >= current_date
      AND (s.session_date::timestamp + s.start_time) - (g.confirmation_deadline_hours || ' hours')::interval <= now()
  LOOP
    FOR v_conf IN
      SELECT c.*, p.full_name
      FROM confirmations c
      JOIN profiles p ON c.player_id = p.id
      WHERE c.session_id = v_session.id
        AND c.status = 'pending'
    LOOP
      -- Only send if no notification already sent for this session+player
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_conf.player_id
          AND related_session_id = v_session.id
          AND type = 'confirmation_request'
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, related_session_id, related_group_id)
        VALUES (
          v_conf.player_id,
          'confirmation_request',
          'Can you make it? ' || v_session.group_name,
          v_session.group_name || ' — ' || to_char(v_session.session_date, 'Dy') || ' at ' || to_char(v_session.group_start, 'HH24:MI'),
          v_session.id,
          v_session.group_id
        );
        v_notifications_sent := v_notifications_sent + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('notifications_sent', v_notifications_sent);
END;
$$;

-- ================================================================
-- FUNCTION: handle_no_response_deadline
-- Mark past-deadline pending confirmations as no_response, create open spots
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_no_response_deadline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conf record;
  v_spots_created integer := 0;
  v_notified integer := 0;
  v_waitlist_member record;
BEGIN
  FOR v_conf IN
    SELECT c.*, s.group_id, s.session_date, s.start_time as session_start, g.name as group_name, g.confirmation_deadline_hours
    FROM confirmations c
    JOIN sessions s ON c.session_id = s.id
    JOIN groups g ON s.group_id = g.id
    WHERE c.status = 'pending'
      AND s.status = 'scheduled'
      AND (s.session_date::timestamp + s.start_time) - (g.confirmation_deadline_hours || ' hours')::interval < now()
  LOOP
    -- Mark as no_response
    UPDATE confirmations
    SET status = 'no_response', responded_at = now()
    WHERE id = v_conf.id;

    -- Create open spot
    INSERT INTO open_spots (session_id, group_id, status)
    VALUES (v_conf.session_id, v_conf.group_id, 'open')
    ON CONFLICT DO NOTHING;
    v_spots_created := v_spots_created + 1;

    -- Notify waitlist/flex players
    FOR v_waitlist_member IN
      SELECT gm.player_id
      FROM group_members gm
      WHERE gm.group_id = v_conf.group_id
        AND gm.status IN ('waitlist', 'flex')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_waitlist_member.player_id
          AND related_session_id = v_conf.session_id
          AND type = 'spot_opened'
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, related_session_id, related_group_id)
        VALUES (
          v_waitlist_member.player_id,
          'spot_opened',
          'Spot available! ' || v_conf.group_name,
          v_conf.group_name || ' — ' || to_char(v_conf.session_date, 'Dy DD Mon') || ' at ' || to_char(v_conf.session_start, 'HH24:MI') || '. Tap to claim.',
          v_conf.session_id,
          v_conf.group_id
        );
        v_notified := v_notified + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('spots_created', v_spots_created, 'notified', v_notified);
END;
$$;

-- Unique constraint on confirmations (session_id, player_id) for ON CONFLICT
ALTER TABLE public.confirmations DROP CONSTRAINT IF EXISTS confirmations_session_id_player_id_key;
ALTER TABLE public.confirmations ADD CONSTRAINT confirmations_session_id_player_id_key UNIQUE (session_id, player_id);

-- Unique constraint on open_spots to prevent duplicates from no_response handling
ALTER TABLE public.open_spots DROP CONSTRAINT IF EXISTS open_spots_session_id_created_by_decline_of_key;
