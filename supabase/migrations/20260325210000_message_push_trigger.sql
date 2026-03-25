-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Config table for environment-specific settings (URL differs between dev/prod)
CREATE TABLE IF NOT EXISTS public._config (key text PRIMARY KEY, value text);

-- Trigger function: send push notification on every new message
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS trigger AS $$
DECLARE
  base_url text;
BEGIN
  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'action', 'notify_message',
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'message_preview', left(NEW.content, 100)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block message inserts if push fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after every message insert
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
