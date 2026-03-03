
-- group_messages table
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members read messages"
ON public.group_messages FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
);

CREATE POLICY "Group members send messages"
ON public.group_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Profiles visibility for group members (needed for chat names)
CREATE POLICY "Group members view each other profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.player_id = auth.uid() AND gm2.player_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.groups WHERE coach_id = profiles.id AND public.is_group_member(id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.groups WHERE coach_id = auth.uid() AND public.is_group_member(id, profiles.id)
  )
);
