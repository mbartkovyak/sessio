-- Auto-create a conversation when a training is created.
-- This eliminates the fragile "create on first message" pattern.

-- 1. Trigger: new training → conversation + coach as participant
CREATE OR REPLACE FUNCTION public.create_training_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _conv_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.conversations (id, training_id) VALUES (_conv_id, NEW.id);
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv_id, NEW.coach_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_training_created
  AFTER INSERT ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_training_conversation();

-- 2. Backfill: create conversations for existing trainings that don't have one
INSERT INTO public.conversations (id, training_id)
SELECT gen_random_uuid(), t.id
FROM public.trainings t
LEFT JOIN public.conversations c ON c.training_id = t.id
WHERE c.id IS NULL;

-- 3. Backfill: add coaches as participants where missing
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, t.coach_id
FROM public.conversations c
JOIN public.trainings t ON t.id = c.training_id
ON CONFLICT DO NOTHING;

-- 4. Backfill: add existing training members as participants where missing
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT c.id, tm.user_id
FROM public.conversations c
JOIN public.training_members tm ON tm.training_id = c.training_id
ON CONFLICT DO NOTHING;
