-- Drop unused legacy tables from Lovable export
-- None of these are queried by app code. All were replaced by the current schema.

-- Legacy messaging (replaced by unified conversations/messages)
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.group_messages CASCADE;
DROP TABLE IF EXISTS public.training_messages CASCADE;

-- Legacy groups system (replaced by trainings)
DROP TABLE IF EXISTS public.open_spots CASCADE;
DROP TABLE IF EXISTS public.confirmations CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- Legacy notifications (replaced by push_subscriptions + in-app)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Legacy coaches table (replaced by profiles with role='coach')
DROP TABLE IF EXISTS public.coaches CASCADE;
