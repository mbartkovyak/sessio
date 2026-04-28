import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { toast } from 'sonner';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { getOrCreateDMConversation } from '@/hooks/shared/useConversations';
import type { Tables } from '@/integrations/supabase/types';

type CoachProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'sport' | 'city'>;
type SchoolMemberWithCoach = Pick<Tables<'school_members'>, 'id' | 'coach_id' | 'status'> & { coach: CoachProfile | null };
type SchoolWithMembers = Tables<'schools'> & {
  school_members: SchoolMemberWithCoach[];
  pending_members?: SchoolMemberWithCoach[];
};

type SchoolBasic = Pick<Tables<'schools'>, 'id' | 'name' | 'sport' | 'country' | 'city' | 'logo_url' | 'venues'>;
type SchoolMembershipRow = Pick<Tables<'school_members'>, 'id' | 'school_id' | 'status'> & { schools: SchoolBasic | null };

type ReviewWithReviewer = Tables<'reviews'> & { profiles: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null };

type FavouriteSchoolWithSchool = Tables<'favourite_schools'> & { school: SchoolBasic | null };

type DiscoverableSchoolRow = Pick<Tables<'schools'>, 'id' | 'name' | 'sport' | 'city' | 'logo_url' | 'description'> & {
  school_members: Pick<Tables<'school_members'>, 'id' | 'status'>[];
};
type DiscoverableSchool = DiscoverableSchoolRow & { coach_count: number };

type DiscoverableCoach = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'sport' | 'city' | 'bio'> & {
  schools: Pick<Tables<'schools'>, 'id' | 'name'> | null;
  avg_rating: number | null;
  review_count: number;
};

/** School owner — fetch my school with approved coaches only */
export function useMySchool() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('*, school_members(id, coach_id, status, coach:profiles(id, full_name, avatar_url, sport, city, bio))')
        .eq('owner_id', user!.id)
        .maybeSingle();
      if (!data) return data;
      // Split approved vs pending in JS (supabase can't filter nested)
      const all = (data).school_members ?? [];
      (data).school_members = all.filter((m: any) => m.status === 'approved');
      (data).pending_members = all.filter((m: any) => m.status === 'pending');
      return data as SchoolWithMembers;
    },
  });
}

/** Coach (not owner) — fetch the school I belong to (approved only) */
export function useMySchoolMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school-membership', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('school_members')
        .select('id, school_id, status, schools:school_id(id, name, sport, country, city, logo_url, venues)')
        .eq('coach_id', user!.id)
        .eq('status', 'approved')
        .maybeSingle();
      return data as SchoolMembershipRow | null;
    },
  });
}

/** Coach — check if has a pending school request (blocking screen) */
export function useMyPendingSchoolRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-pending-school-request', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('school_members')
        .select('id, school_id, status, schools:school_id(id, name, sport, city, logo_url)')
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .maybeSingle();
      return data as SchoolMembershipRow | null;
    },
  });
}

/** Fetch a single school by ID (public) */
export function useSchool(id: string | undefined) {
  return useQuery({
    queryKey: ['school', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*, school_members(id, coach_id, status, coach:profiles(id, full_name, avatar_url, sport, city, bio))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      // Only return approved coaches
      if (data) {
        const all = (data).school_members ?? [];
        (data).school_members = all.filter((m: any) => m.status === 'approved');
      }
      return data as SchoolWithMembers;
    },
  });
}

/** School owner — approve or decline a pending coach */
export function useRespondSchoolMember() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, coachId, accept }: { memberId: string; coachId: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from('school_members')
          .update({ status: 'approved' })
          .eq('id', memberId);
        if (error) throw error;
        // Auto-create DM between school owner and new coach
        if (user) {
          try { await getOrCreateDMConversation(coachId); } catch {}
        }
      } else {
        const { error } = await supabase
          .from('school_members')
          .delete()
          .eq('id', memberId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { accept }) => {
      toast.success(i18n.t(accept ? 'toast.coachApproved' : 'toast.requestDeclined', { ns: 'common' }));
      qc.invalidateQueries({ queryKey: ['my-school'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Favourites ──

export function useIsFavouriteSchool(schoolId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['fav-school', user?.id, schoolId],
    enabled: !!user && !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('favourite_schools')
        .select('id')
        .eq('user_id', user!.id)
        .eq('school_id', schoolId!)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useToggleFavouriteSchool() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ schoolId, isFav }: { schoolId: string; isFav: boolean }) => {
      if (isFav) {
        const { error } = await supabase
          .from('favourite_schools')
          .delete()
          .eq('user_id', user!.id)
          .eq('school_id', schoolId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favourite_schools')
          .insert({ user_id: user!.id, school_id: schoolId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isFav }) => {
      qc.invalidateQueries({ queryKey: ['fav-school'] });
      qc.invalidateQueries({ queryKey: ['favourite-schools'] });
      toast.success(i18n.t(isFav ? 'toast.removedFromFavourites' : 'toast.addedToFavourites', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useMyFavouriteSchools() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favourite-schools', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('favourite_schools')
        .select('*, school:school_id(id, name, sport, city, logo_url)')
        .eq('user_id', user!.id);
      return (data ?? []) as FavouriteSchoolWithSchool[];
    },
  });
}

// ── Coach favourites ──

export function useIsFavouriteCoach(coachId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['fav-coach', user?.id, coachId],
    enabled: !!user && !!coachId,
    queryFn: async () => {
      const { data } = await supabase
        .from('favourite_coaches')
        .select('id')
        .eq('user_id', user!.id)
        .eq('coach_id', coachId!)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useToggleFavouriteCoach() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ coachId, isFav }: { coachId: string; isFav: boolean }) => {
      if (isFav) {
        const { error } = await supabase
          .from('favourite_coaches')
          .delete()
          .eq('user_id', user!.id)
          .eq('coach_id', coachId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favourite_coaches')
          .insert({ user_id: user!.id, coach_id: coachId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isFav }) => {
      qc.invalidateQueries({ queryKey: ['fav-coach'] });
      qc.invalidateQueries({ queryKey: ['favourite-coaches'] });
      toast.success(i18n.t(isFav ? 'toast.removedFromFavourites' : 'toast.addedToFavourites', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

type FavouriteCoachRow = Tables<'favourite_coaches'> & {
  coach: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'sport' | 'city'> | null;
};

export function useMyFavouriteCoaches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favourite-coaches', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: favourites, error: favouritesError } = await supabase
        .from('favourite_coaches')
        .select('*')
        .eq('user_id', user!.id);
      if (favouritesError) throw favouritesError;

      const rows = favourites ?? [];
      if (rows.length === 0) return [] as FavouriteCoachRow[];

      const coachIds = rows.map(row => row.coach_id);
      const { data: coaches, error: coachesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, sport, city')
        .in('id', coachIds);
      if (coachesError) throw coachesError;

      const coachesById = new Map((coaches ?? []).map(coach => [coach.id, coach]));
      return rows.map(row => ({
        ...row,
        coach: coachesById.get(row.coach_id) ?? null,
      })) as FavouriteCoachRow[];
    },
  });
}

// ── Reviews ──

export function useCanReviewCoach(coachId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['can-review-coach', user?.id, coachId],
    enabled: !!user && !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_review_coach', { p_coach_id: coachId! });
      if (error) throw error;
      return !!data;
    },
  });
}

export type SchoolReview = {
  id: string;
  rating: number;
  text: string | null;
  coach_response: string | null;
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_avatar_url: string | null;
  coach_id: string;
  coach_name: string | null;
  created_at: string;
};

export function useSchoolReviews(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-reviews', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_school_reviews', { p_school_id: schoolId! });
      if (error) throw error;
      return (data ?? []) as SchoolReview[];
    },
  });
}

export function useLeaveReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ coachId, rating, text }: { coachId: string; rating: number; text?: string }) => {
      const { error } = await supabase
        .from('reviews')
        .insert({ reviewer_id: user!.id, coach_id: coachId, rating, text: text || null });
      if (error) throw error;
    },
    onSuccess: (_, { coachId }) => {
      qc.invalidateQueries({ queryKey: ['coach-reviews', coachId] });
      qc.invalidateQueries({ queryKey: ['can-review-coach'] });
      qc.invalidateQueries({ queryKey: ['school-reviews'] });
      toast.success(i18n.t('toast.reviewSubmitted', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Existing hooks (unchanged) ──

export function useCreateSchool() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('schools')
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'schools'>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school'] });
      toast.success(i18n.t('toast.schoolCreated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useUpdateSchool(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase.from('schools').update(values).eq('id', schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school'] });
      qc.invalidateQueries({ queryKey: ['school', schoolId] });
      toast.success(i18n.t('toast.schoolUpdated', { ns: 'common' }));
    },
  });
}

export function useDiscoverableSchools(search?: string, sport?: string, city?: string, country?: string) {
  return useQuery({
    queryKey: ['schools-discover', search, sport, city, country],
    queryFn: async () => {
      let q = supabase
        .from('schools')
        .select('id, name, sport, city, logo_url, description, school_members(id, status)')
        .not('name', 'is', null)
        .eq('is_listed', true);
      if (search) q = q.ilike('name', `%${search}%`);
      if (sport) q = q.contains('sport', [sport]);
      if (city) q = q.ilike('city', `%${city}%`);
      if (country) q = q.eq('country', country);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return ((data ?? []) as DiscoverableSchoolRow[]).map(s => ({
        ...s,
        coach_count: s.school_members?.filter((m: any) => m.status === 'approved').length ?? 0,
      })) as DiscoverableSchool[];
    },
  });
}

export function useDiscoverableCoaches(search?: string, sport?: string, city?: string, country?: string) {
  return useQuery({
    queryKey: ['coaches-discover', search, sport, city, country],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, sport, city, bio, school_id, schools:school_id(id, name), reviews!reviews_coach_id_fkey(rating)')
        .in('role', ['coach', 'school_owner'])
        .not('full_name', 'is', null);
      if (search) q = q.ilike('full_name', `%${search}%`);
      if (sport) q = q.eq('sport', sport);
      if (city) q = q.ilike('city', `%${city}%`);
      if (country) q = q.eq('country', country);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return ((data ?? []) as any[]).map(c => {
        const ratings = (c.reviews ?? []).map((r: any) => r.rating as number);
        const review_count = ratings.length;
        const avg_rating = review_count >= 3
          ? ratings.reduce((sum: number, r: number) => sum + r, 0) / review_count
          : null;
        const { reviews, ...rest } = c;
        return { ...rest, avg_rating, review_count } as DiscoverableCoach;
      });
    },
  });
}

export function useCoachReviews(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-reviews', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles:reviewer_id(id, full_name, avatar_url)')
        .eq('coach_id', coachId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewWithReviewer[];
    },
  });
}

export type PublicUpcomingSession = {
  session_id: string;
  training_id: string;
  training_name: string;
  sport: string;
  invite_code: string;
  is_recurring: boolean | null;
  drop_in_policy: 'allowed' | 'trial' | 'none';
  booking_mode: 'instant' | 'approval';
  type: 'group' | 'individual';
  coach_id: string;
  coach_name: string | null;
  coach_avatar_url: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
};

export function useCoachUpcomingSessions(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-upcoming-sessions', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_coach_upcoming_sessions', {
        p_coach_id: coachId!,
        p_days: 14,
      });
      if (error) throw error;
      return (data ?? []) as PublicUpcomingSession[];
    },
  });
}

export function useSchoolUpcomingSessions(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-upcoming-sessions', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_school_upcoming_sessions', {
        p_school_id: schoolId!,
        p_days: 14,
      });
      if (error) throw error;
      return (data ?? []) as PublicUpcomingSession[];
    },
  });
}
