-- Move read tracking from localStorage to database.
-- Adds last_read_at (when user last read a conversation) and hidden (archived DMs).

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Let users update their own participation rows (for marking read + archiving)
CREATE POLICY "Update own participation" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
