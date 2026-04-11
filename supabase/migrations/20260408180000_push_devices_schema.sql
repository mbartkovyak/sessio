-- Transport-agnostic push device schema.
--
-- Extends the existing push_subscriptions table so the same row shape can
-- represent web push (VAPID), FCM (Android + iOS via Firebase), and future
-- direct APNs. Identity is (user_id, device_id) — a client-generated UUID
-- stable across token rotations. Per-operation RLS policies (FOR ALL + a
-- single USING is a known RLS trap — see CLAUDE.md).
--
-- This migration is defensive and idempotent:
--  * assumes nothing about constraint names (they drift across envs)
--  * drops only the legacy (user_id, endpoint|target) unique
--  * rename steps are guarded by information_schema checks
--  * backfills legacy web rows before adding NOT NULL
--
-- Columns after migration:
--   id, user_id, device_id, platform, transport, target, web_keys,
--   created_at, updated_at, last_seen_at

-- Columns (additive) ----------------------------------------------------------
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS transport TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Renames (only if the old column still exists) ------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'push_subscriptions'
      AND column_name = 'endpoint'
  ) THEN
    ALTER TABLE public.push_subscriptions RENAME COLUMN endpoint TO target;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'push_subscriptions'
      AND column_name = 'keys'
  ) THEN
    ALTER TABLE public.push_subscriptions RENAME COLUMN keys TO web_keys;
  END IF;
END $$;

-- web_keys is NULL for native rows (FCM/APNs tokens don't have VAPID keys)
ALTER TABLE public.push_subscriptions ALTER COLUMN web_keys DROP NOT NULL;

-- Backfill legacy rows --------------------------------------------------------
UPDATE public.push_subscriptions SET platform  = 'web'     WHERE platform  IS NULL;
UPDATE public.push_subscriptions SET transport = 'webpush' WHERE transport IS NULL;
UPDATE public.push_subscriptions SET device_id = id::text  WHERE device_id IS NULL;

-- NOT NULL after backfill -----------------------------------------------------
-- target stays NOT NULL (inherited from the original endpoint column).
-- Re-asserted so future migrations can't relax it and so UNIQUE(transport,
-- target) can't admit multiple NULLs.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN device_id SET NOT NULL,
  ALTER COLUMN platform  SET NOT NULL,
  ALTER COLUMN transport SET NOT NULL,
  ALTER COLUMN target    SET NOT NULL;

-- CHECK constraints (idempotent) ----------------------------------------------
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_platform_check,
  DROP CONSTRAINT IF EXISTS push_subscriptions_transport_check;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_platform_check
    CHECK (platform IN ('web', 'ios', 'android')),
  ADD CONSTRAINT push_subscriptions_transport_check
    CHECK (transport IN ('webpush', 'fcm', 'apns'));

-- Drop ONLY the legacy (user_id, endpoint|target) unique by column-set lookup.
-- Does not touch unrelated unique constraints (e.g. pkey, future composites).
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'push_subscriptions'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname ORDER BY att.attnum)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = k.attnum
      ) IN (
        ARRAY['user_id', 'endpoint']::name[],
        ARRAY['user_id', 'target']::name[]
      )
  LOOP
    EXECUTE format('ALTER TABLE public.push_subscriptions DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- De-duplicate (transport, target) before adding the new unique constraint.
-- The old schema's unique was (user_id, endpoint), which allowed the same
-- endpoint across users (e.g. one browser signed in to multiple accounts
-- over time). The new (transport, target) unique enforces one-device-per-
-- endpoint globally. Keep the most recently created row — older rows will
-- re-subscribe on next app open, which is the correct behavior (that device
-- is no longer "owned" by the old user).
DELETE FROM public.push_subscriptions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY transport, target
             ORDER BY created_at DESC
           ) AS rn
    FROM public.push_subscriptions
  ) ranked
  WHERE rn > 1
);

-- Identity + uniqueness (idempotent) ------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_device_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_device_unique
        UNIQUE (user_id, device_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_transport_target_unique'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_transport_target_unique
        UNIQUE (transport, target);
  END IF;
END $$;

-- Split RLS per-operation -----------------------------------------------------
-- FOR ALL with USING doubles as WITH CHECK for INSERT and can silently block
-- inserts. Per CLAUDE.md, always split.
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_select_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_insert_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_update_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subs_delete_own" ON public.push_subscriptions;

CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_update_own" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Grants — service_role is used by edge functions; never assume defaults ----
GRANT ALL ON public.push_subscriptions TO service_role;
