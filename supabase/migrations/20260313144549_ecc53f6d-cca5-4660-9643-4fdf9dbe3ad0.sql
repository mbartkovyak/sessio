
-- Fix: Create training_members first, then the helper function, then trainings

-- 1. COACHES table
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT, city TEXT, bio TEXT, video_url TEXT, location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches viewable by authenticated" ON public.coaches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Coaches insert own record" ON public.coaches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches update own record" ON public.coaches FOR UPDATE USING (auth.uid() = user_id);

-- 2. SCHOOLS table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, sport TEXT, city TEXT, description TEXT, logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schools viewable by authenticated" ON public.schools FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "School owners insert" ON public.schools FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "School owners update" ON public.schools FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "School owners delete" ON public.schools FOR DELETE USING (auth.uid() = owner_id);

-- 3. SCHOOL_MEMBERS
CREATE TABLE IF NOT EXISTS public.school_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, coach_id)
);
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School members viewable by owner or members" ON public.school_members FOR SELECT
  USING (auth.uid() = coach_id OR EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND owner_id = auth.uid()));
CREATE POLICY "School owners manage members" ON public.school_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND owner_id = auth.uid()));
CREATE POLICY "Coaches insert own school membership" ON public.school_members FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- 4. TRAININGS table (no policies yet — they need helper fn)
CREATE TABLE IF NOT EXISTS public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('group', 'individual')),
  sport TEXT NOT NULL,
  venue TEXT NOT NULL,
  max_players INTEGER,
  recurrence_pattern TEXT NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  confirmation_window_hours INTEGER NOT NULL DEFAULT 48,
  no_response_behavior TEXT NOT NULL DEFAULT 'mark_absent' CHECK (no_response_behavior IN ('mark_absent', 'keep_pending', 'auto_decline')),
  cancel_enabled BOOLEAN NOT NULL DEFAULT true,
  cancel_deadline_hours INTEGER NOT NULL DEFAULT 2,
  notification_channel TEXT NOT NULL DEFAULT 'push_email' CHECK (notification_channel IN ('push_email', 'push_only')),
  booking_mode TEXT NOT NULL DEFAULT 'instant' CHECK (booking_mode IN ('instant', 'approval')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('discoverable', 'private')),
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  allow_waitlist BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own trainings" ON public.trainings FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "All active trainings via invite" ON public.trainings FOR SELECT USING (is_active = true);

-- 5. TRAINING_MEMBERS
CREATE TABLE IF NOT EXISTS public.training_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'regular' CHECK (role IN ('regular', 'waitlist', 'flex')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_id, user_id)
);
ALTER TABLE public.training_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage training members" ON public.training_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));
CREATE POLICY "Players insert own training membership" ON public.training_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players view own training memberships" ON public.training_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Players delete own training membership" ON public.training_members FOR DELETE USING (auth.uid() = user_id);

-- 6. Helper function (now training_members exists)
CREATE OR REPLACE FUNCTION public.is_training_member(_training_id UUID, _player_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.training_members WHERE training_id = _training_id AND user_id = _player_id);
$$;

-- 7. Add member-based policies to trainings (now fn exists)
CREATE POLICY "Training members view trainings" ON public.trainings FOR SELECT USING (is_training_member(id, auth.uid()));
CREATE POLICY "Discoverable trainings viewable" ON public.trainings FOR SELECT USING (visibility = 'discoverable' AND is_active = true AND auth.role() = 'authenticated');

-- 8. TRAINING_SESSIONS
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage training sessions" ON public.training_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));
CREATE POLICY "Members view training sessions" ON public.training_sessions FOR SELECT
  USING (is_training_member(training_id, auth.uid()));

-- 9. SESSION_ATTENDANCE
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'no_show')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches view session attendance" ON public.session_attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE ts.id = session_id AND t.coach_id = auth.uid()));
CREATE POLICY "Players view own session attendance" ON public.session_attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Players create own session attendance" ON public.session_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players update own session attendance" ON public.session_attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Coaches update session attendance" ON public.session_attendance FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE ts.id = session_id AND t.coach_id = auth.uid()));

-- 10. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.trainings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT, coach_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, coach_id, training_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews readable by all authenticated" ON public.reviews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Players insert own reviews" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id AND EXISTS (SELECT 1 FROM public.training_members tm JOIN public.trainings t ON tm.training_id = t.id WHERE tm.user_id = auth.uid() AND t.coach_id = reviews.coach_id));
CREATE POLICY "Players update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Coaches add response to reviews" ON public.reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = reviews.id AND r.coach_id = auth.uid()));

-- 11. TRAINING_MESSAGES
CREATE TABLE IF NOT EXISTS public.training_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Training members read messages" ON public.training_messages FOR SELECT
  USING (is_training_member(training_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));
CREATE POLICY "Training members send messages" ON public.training_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (is_training_member(training_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid())));

-- 12. JOIN_REQUESTS
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id)
);
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view own join requests" ON public.join_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Players create join requests" ON public.join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches manage join requests" ON public.join_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));

-- 13. TRAINING_OPEN_SPOTS
CREATE TABLE IF NOT EXISTS public.training_open_spots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed')),
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.training_open_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Training members view open spots" ON public.training_open_spots FOR SELECT
  USING (is_training_member(training_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));
CREATE POLICY "Coaches manage training open spots" ON public.training_open_spots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND coach_id = auth.uid()));
CREATE POLICY "Players claim training spots" ON public.training_open_spots FOR UPDATE
  USING (status = 'open') WITH CHECK (auth.uid() = claimed_by AND status = 'claimed');

-- 14. Profile columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 15. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_open_spots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;

-- 16. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Avatars public select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own video" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Video owner select" ON storage.objects FOR SELECT USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 17. Generate training sessions function
CREATE OR REPLACE FUNCTION public.generate_sessions_for_training(p_training_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_training public.trainings%ROWTYPE;
  v_target_date DATE;
  v_today DATE := current_date;
  v_end_date DATE := current_date + 14;
  v_session_id UUID;
  v_created INTEGER := 0;
BEGIN
  SELECT * INTO v_training FROM public.trainings WHERE id = p_training_id;
  IF NOT FOUND OR NOT v_training.is_active THEN RETURN jsonb_build_object('created', 0); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() != v_training.coach_id THEN RETURN jsonb_build_object('created', 0, 'error', 'Unauthorized'); END IF;
  v_target_date := v_today + ((v_training.day_of_week + 1 - EXTRACT(DOW FROM v_today)::INTEGER + 7) % 7);
  WHILE v_target_date <= v_end_date LOOP
    IF NOT EXISTS (SELECT 1 FROM public.training_sessions WHERE training_id = p_training_id AND session_date = v_target_date) THEN
      INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
      VALUES (p_training_id, v_target_date, v_training.start_time, v_training.end_time, 'scheduled')
      RETURNING id INTO v_session_id;
      INSERT INTO public.session_attendance (session_id, user_id, status)
      SELECT v_session_id, tm.user_id, 'pending' FROM public.training_members tm
      WHERE tm.training_id = p_training_id AND tm.role = 'regular'
      ON CONFLICT (session_id, user_id) DO NOTHING;
      v_created := v_created + 1;
    END IF;
    v_target_date := v_target_date + 7;
  END LOOP;
  RETURN jsonb_build_object('created', v_created);
END;
$$;

-- 18. Claim training spot RPC
CREATE OR REPLACE FUNCTION public.claim_training_spot(p_spot_id UUID, p_player_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_spot public.training_open_spots%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_player_id THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT * INTO v_spot FROM public.training_open_spots WHERE id = p_spot_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Spot not found'); END IF;
  IF v_spot.status != 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'already_claimed'); END IF;
  IF NOT is_training_member(v_spot.training_id, p_player_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Not a member'); END IF;
  UPDATE public.training_open_spots SET status = 'claimed', claimed_by = p_player_id, claimed_at = now() WHERE id = p_spot_id;
  INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (v_spot.session_id, p_player_id, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO UPDATE SET status = 'confirmed', confirmed_at = now();
  RETURN jsonb_build_object('success', true, 'session_id', v_spot.session_id);
END;
$$;
