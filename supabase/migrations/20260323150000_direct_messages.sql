-- Direct messages between two users (same pattern as training_messages)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  receiver_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users read own DMs" ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages as themselves
CREATE POLICY "Users send DMs" ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX idx_dm_participants ON public.direct_messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_dm_receiver ON public.direct_messages (receiver_id, created_at DESC);
