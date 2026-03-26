-- Seed _config with values needed by pg_cron (automation) and message push trigger.
-- After applying, set the matching Edge Function secret:
--   supabase secrets set CRON_SECRET=dev-cron-a7f3b2e14d5c

-- Dev environment (sessio-dev / iindwpdpmtztwwsejarz)
INSERT INTO public._config (key, value) VALUES
  ('supabase_url', 'https://iindwpdpmtztwwsejarz.supabase.co'),
  ('cron_secret', 'dev-cron-a7f3b2e14d5c')
ON CONFLICT (key) DO NOTHING;
