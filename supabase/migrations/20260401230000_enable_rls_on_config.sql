-- _config stores supabase_url and cron_secret — must not be publicly readable.
-- Only SECURITY DEFINER functions (notify_new_message, pg_cron automation) read it,
-- so no RLS policies are needed — those functions bypass RLS.
ALTER TABLE public._config ENABLE ROW LEVEL SECURITY;
