import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** School owner — fetch my school with approved coaches only */
export function useMySchool() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools' as any)
        .select('*, school_members(id, coach_id, status, coach:profiles(id, full_name, avatar_url, sport, city))')
        .eq('owner_id', user!.id)
        .maybeSingle();
      if (!data) return data;
      // Split approved vs pending in JS (supabase can't filter nested)
      const all = (data as any).school_members ?? [];
      (data as any).school_members = all.filter((m: any) => m.status === 'approved');
      (data as any).pending_members = all.filter((m: any) => m.status === 'pending');
      return data as any;
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
        .from('school_members' as any)
        .select('id, school_id, status, schools:school_id(id, name, sport, city, logo_url)')
        .eq('coach_id', user!.id)
        .eq('status', 'approved')
        .maybeSingle();
      return data as any;
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
        .from('school_members' as any)
        .select('id, school_id, status, schools:school_id(id, name, sport, city, logo_url)')
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .maybeSingle();
      return data as any;
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
        .from('schools' as any)
        .select('*, school_members(id, coach_id, status, coach:profiles(id, full_name, avatar_url, sport, city))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      // Only return approved coaches
      if (data) {
        const all = (data as any).school_members ?? [];
        (data as any).school_members = all.filter((m: any) => m.status === 'approved');
      }
      return data as any;
    },
  });
}

/** Group trainings for a school (public-facing — group + discoverable only) */
export function useSchoolPublicTrainings(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-public-trainings', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings' as any)
        .select('*, coach:profiles!trainings_coach_id_fkey(id, full_name, avatar_url)')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .eq('type', 'group')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

/** School owner — approve or decline a pending coach */
export function useRespondSchoolMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, accept }: { memberId: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from('school_members' as any)
          .update({ status: 'approved' })
          .eq('id', memberId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_members' as any)
          .delete()
          .eq('id', memberId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { accept }) => {
      toast.success(accept ? 'Coach approved!' : 'Request declined');
      qc.invalidateQueries({ queryKey: ['my-school'] });
    },
    onError: (e: any) => toast.error(e.message),
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
        .from('favourite_schools' as any)
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
          .from('favourite_schools' as any)
          .delete()
          .eq('user_id', user!.id)
          .eq('school_id', schoolId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favourite_schools' as any)
          .insert({ user_id: user!.id, school_id: schoolId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { schoolId, isFav }) => {
      qc.invalidateQueries({ queryKey: ['fav-school'] });
      qc.invalidateQueries({ queryKey: ['favourite-schools'] });
      toast.success(isFav ? 'Removed from favourites' : 'Added to favourites');
    },
  });
}

export function useMyFavouriteSchools() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favourite-schools', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('favourite_schools' as any)
        .select('*, school:school_id(id, name, sport, city, logo_url)')
        .eq('user_id', user!.id);
      return (data ?? []) as any[];
    },
  });
}

// ── Existing hooks (unchanged) ──

export function useCreateSchool() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('schools' as any)
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school'] });
      toast.success('School created!');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSchool(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase.from('schools' as any).update(values).eq('id', schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-school'] });
      qc.invalidateQueries({ queryKey: ['school', schoolId] });
      toast.success('School updated');
    },
  });
}

export function useDiscoverableSchools(search?: string, sport?: string, city?: string) {
  return useQuery({
    queryKey: ['schools-discover', search, sport, city],
    queryFn: async () => {
      let q = supabase
        .from('schools' as any)
        .select('id, name, sport, city, logo_url, description, school_members(id, status)')
        .not('name', 'is', null);
      if (search) q = q.ilike('name', `%${search}%`);
      if (sport) q = q.eq('sport', sport);
      if (city) q = q.ilike('city', `%${city}%`);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return ((data ?? []) as any[]).map(s => ({
        ...s,
        coach_count: s.school_members?.filter((m: any) => m.status === 'approved').length ?? 0,
      }));
    },
  });
}

export function useDiscoverableCoaches(search?: string, sport?: string, city?: string) {
  return useQuery({
    queryKey: ['coaches-discover', search, sport, city],
    queryFn: async () => {
      let q = supabase
        .from('profiles' as any)
        .select('id, full_name, avatar_url, sport, city, bio')
        .in('role', ['coach', 'school_owner'])
        .not('full_name', 'is', null);
      if (search) q = q.ilike('full_name', `%${search}%`);
      if (sport) q = q.eq('sport', sport);
      if (city) q = q.ilike('city', `%${city}%`);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCoachReviews(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-reviews', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews' as any)
        .select('*, profiles:reviewer_id(id, full_name, avatar_url)')
        .eq('coach_id', coachId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCoachTrainings(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-trainings-public', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings' as any)
        .select('*')
        .eq('coach_id', coachId!)
        .eq('is_active', true)
        .eq('visibility', 'discoverable');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}
