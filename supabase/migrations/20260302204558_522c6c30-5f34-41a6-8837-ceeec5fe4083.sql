
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('coach', 'player')),
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups table (without member policy for now)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'All levels' CHECK (level IN ('Beginner','Intermediate','Advanced','All levels')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  location TEXT NOT NULL,
  confirmation_deadline_hours INTEGER NOT NULL DEFAULT 24,
  allow_waitlist BOOLEAN NOT NULL DEFAULT TRUE,
  invite_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own groups" ON public.groups FOR ALL USING (auth.uid() = coach_id);

-- Group members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','waitlist','flex')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, player_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches see members of own groups" ON public.group_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
);
CREATE POLICY "Players see own memberships" ON public.group_members FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "Players insert own membership" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Now add the member-based policy to groups
CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND player_id = auth.uid())
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage sessions of own groups" ON public.sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
);
CREATE POLICY "Members view sessions of their groups" ON public.sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = sessions.group_id AND player_id = auth.uid())
);

-- Confirmations table
CREATE TABLE public.confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','no_response')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches view confirmations of own sessions" ON public.confirmations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions s JOIN public.groups g ON s.group_id = g.id WHERE s.id = session_id AND g.coach_id = auth.uid())
);
CREATE POLICY "Players manage own confirmations" ON public.confirmations FOR ALL USING (auth.uid() = player_id);

-- Open spots table
CREATE TABLE public.open_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by_decline_of UUID REFERENCES public.profiles(id),
  claimed_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);
ALTER TABLE public.open_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members see open spots" ON public.open_spots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = open_spots.group_id AND player_id = auth.uid() AND status IN ('active','waitlist','flex'))
);
CREATE POLICY "Coaches manage open spots of own groups" ON public.open_spots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confirmation_request','spot_opened','spot_claimed','session_cancelled','reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_session_id UUID REFERENCES public.sessions(id),
  related_group_id UUID REFERENCES public.groups(id),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
