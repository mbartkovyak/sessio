-- =============================================================
-- Fix: Swap all user FKs from auth.users → public.profiles
--
-- PostgREST (Supabase) can only join tables through FKs it can
-- see in the public schema. auth.users is invisible to it, so
-- every join like profiles:coach_id(...) silently breaks.
--
-- profiles.id is always identical to auth.users.id (enforced by
-- the existing profiles FK to auth.users), so this is safe.
-- =============================================================

-- 1. trainings.coach_id
ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_coach_id_profiles_fkey;
ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_coach_id_fkey;
ALTER TABLE public.trainings
  ADD CONSTRAINT trainings_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. schools.owner_id
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_owner_id_fkey;
ALTER TABLE public.schools
  ADD CONSTRAINT schools_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. school_members.coach_id
ALTER TABLE public.school_members DROP CONSTRAINT IF EXISTS school_members_coach_id_profiles_fkey;
ALTER TABLE public.school_members DROP CONSTRAINT IF EXISTS school_members_coach_id_fkey;
ALTER TABLE public.school_members
  ADD CONSTRAINT school_members_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. training_members.user_id
ALTER TABLE public.training_members DROP CONSTRAINT IF EXISTS training_members_user_id_fkey;
ALTER TABLE public.training_members
  ADD CONSTRAINT training_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. session_attendance.user_id
ALTER TABLE public.session_attendance DROP CONSTRAINT IF EXISTS session_attendance_user_id_fkey;
ALTER TABLE public.session_attendance
  ADD CONSTRAINT session_attendance_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. reviews.reviewer_id & reviews.coach_id
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_coach_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_coach_id_profiles_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. training_messages.sender_id
ALTER TABLE public.training_messages DROP CONSTRAINT IF EXISTS training_messages_sender_id_fkey;
ALTER TABLE public.training_messages
  ADD CONSTRAINT training_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. join_requests.user_id
ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_user_id_fkey;
ALTER TABLE public.join_requests
  ADD CONSTRAINT join_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 9. training_open_spots.claimed_by
ALTER TABLE public.training_open_spots DROP CONSTRAINT IF EXISTS training_open_spots_claimed_by_fkey;
ALTER TABLE public.training_open_spots
  ADD CONSTRAINT training_open_spots_claimed_by_fkey
  FOREIGN KEY (claimed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 10. coaches.user_id
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_user_id_fkey;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Force PostgREST to pick up the new FK relationships
NOTIFY pgrst, 'reload schema';
