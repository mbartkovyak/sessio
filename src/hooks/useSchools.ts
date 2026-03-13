import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useMySchool() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools' as any)
        .select('*, school_members(id, coach_id, profiles:coach_id(id, full_name, avatar_url, sport, city))')
        .eq('owner_id', user!.id)
        .maybeSingle();
      return data as any;
    },
  });
}

export function useSchool(id: string | undefined) {
  return useQuery({
    queryKey: ['school', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools' as any)
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

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

export function useDiscoverableCoaches(search?: string, sport?: string, city?: string) {
  return useQuery({
    queryKey: ['coaches-discover', search, sport, city],
    queryFn: async () => {
      let q = supabase
        .from('profiles' as any)
        .select('id, full_name, avatar_url, sport, city, bio')
        .eq('role', 'coach')
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
