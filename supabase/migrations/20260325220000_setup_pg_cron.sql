-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Hourly automation: generate sessions, send confirmation reminders, handle deadlines
SELECT cron.schedule(
  'hourly-automation',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM public._config WHERE key = 'supabase_url') || '/functions/v1/automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public._config WHERE key = 'cron_secret')
    ),
    body := '{"action": "full"}'::jsonb
  );
  $$
);
