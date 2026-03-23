-- ============================================================
-- Unified messaging: conversations + messages
-- Replaces training_messages + direct_messages with one system
-- ============================================================

-- 1. New tables
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid REFERENCES public.trainings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_id)
);

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);
CREATE INDEX idx_conversations_training ON public.conversations (training_id) WHERE training_id IS NOT NULL;
CREATE INDEX idx_conv_participants_user ON public.conversation_participants (user_id);

-- 3. Migrate training_messages
-- Create a conversation for each training that has messages
INSERT INTO public.conversations (id, training_id, created_at)
SELECT gen_random_uuid(), tm.training_id, MIN(tm.created_at)
FROM public.training_messages tm
GROUP BY tm.training_id;

-- Add participants: coach + all training members
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT DISTINCT c.id, t.coach_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT DISTINCT c.id, tm.user_id
FROM public.conversations c
JOIN public.training_members tm ON tm.training_id = c.training_id
ON CONFLICT DO NOTHING;

-- Migrate messages (preserve IDs for reaction FK)
INSERT INTO public.messages (id, conversation_id, sender_id, content, created_at)
SELECT tm.id, c.id, tm.sender_id, tm.content, tm.created_at
FROM public.training_messages tm
JOIN public.conversations c ON c.training_id = tm.training_id;

-- 4. Migrate direct_messages
CREATE TEMP TABLE dm_conv_map AS
SELECT gen_random_uuid() AS conv_id,
       LEAST(sender_id, receiver_id) AS user_a,
       GREATEST(sender_id, receiver_id) AS user_b
FROM public.direct_messages
GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id);

INSERT INTO public.conversations (id, training_id, created_at)
SELECT conv_id, NULL, now() FROM dm_conv_map;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT conv_id, user_a FROM dm_conv_map
UNION ALL
SELECT conv_id, user_b FROM dm_conv_map;

INSERT INTO public.messages (id, conversation_id, sender_id, content, created_at)
SELECT dm.id, m.conv_id, dm.sender_id, dm.content, dm.created_at
FROM public.direct_messages dm
JOIN dm_conv_map m ON LEAST(dm.sender_id, dm.receiver_id) = m.user_a
                   AND GREATEST(dm.sender_id, dm.receiver_id) = m.user_b;

DROP TABLE dm_conv_map;

-- 5. Repoint message_reactions FK
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;
ALTER TABLE public.message_reactions
  ADD CONSTRAINT message_reactions_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

-- 6. RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: visible to participants + training coaches + school owners
CREATE POLICY "View conversations" ON public.conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainings t JOIN public.schools s ON s.id = t.school_id WHERE t.id = training_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Participants
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Add participants" ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Messages: visible to conversation participants + training coaches + school owners
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      WHERE c.id = conversation_id AND t.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.trainings t ON t.id = c.training_id
      JOIN public.schools s ON s.id = t.school_id
      WHERE c.id = conversation_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 7. Auto-add participants when training members join
CREATE OR REPLACE FUNCTION public.add_member_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.training_id = NEW.training_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_training_member_added
  AFTER INSERT ON public.training_members
  FOR EACH ROW
  EXECUTE FUNCTION public.add_member_to_conversation();

-- 8. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 9. Drop old tables
DROP TABLE public.training_messages CASCADE;
DROP TABLE public.direct_messages CASCADE;

-- 10. Update delete_account RPC
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  DELETE FROM public.messages WHERE sender_id = _uid;
  DELETE FROM public.conversation_participants WHERE user_id = _uid;
  DELETE FROM public.message_reactions WHERE user_id = _uid;
  DELETE FROM public.session_attendance WHERE user_id = _uid;
  DELETE FROM public.training_members WHERE user_id = _uid;
  DELETE FROM public.join_requests WHERE user_id = _uid;
  DELETE FROM public.favourite_schools WHERE user_id = _uid;
  DELETE FROM public.school_members WHERE coach_id = _uid;
  DELETE FROM public.reviews WHERE reviewer_id = _uid;
  DELETE FROM public.profiles WHERE id = _uid;
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;
