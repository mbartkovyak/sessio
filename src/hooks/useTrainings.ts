import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings' as any)
        .select('*, schools(id, name)')
        .eq('coach_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useTraining(id: string | undefined) {
  return useQuery({
    queryKey: ['training', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings' as any)
        .select('*, schools(id, name), profiles:coach_id(id, full_name, avatar_url, bio, sport, city)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useMyTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members' as any)
        .select('*, trainings(*, profiles:coach_id(id, full_name, avatar_url))')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('trainings' as any)
        .insert({ ...values, coach_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Training created!');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTraining(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase
        .from('trainings' as any)
        .update(values)
        .eq('id', trainingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['training', trainingId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useTrainingMembers(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-members', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members' as any)
        .select('*, profiles:user_id(id, full_name, avatar_url, email)')
        .eq('training_id', trainingId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useRemoveTrainingMember(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('training_members' as any)
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-members', trainingId] });
      toast.success('Member removed');
    },
  });
}

export function useTrainingSessions(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-sessions', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions' as any)
        .select('*')
        .eq('training_id', trainingId!)
        .order('session_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useSessionAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-attendance', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendance' as any)
        .select('*, profiles:user_id(id, full_name, avatar_url)')
        .eq('session_id', sessionId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useMyUpcomingSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-upcoming-sessions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('session_attendance' as any)
        .select('*, training_sessions(*, trainings(id, name, sport, venue, profiles:coach_id(id, full_name, avatar_url)))')
        .eq('user_id', user!.id)
        .gte('training_sessions.session_date', today)
        .order('training_sessions.session_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []).filter((d: any) => d.training_sessions) as any[];
    },
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: string }) => {
      const update: any = { session_id: sessionId, user_id: user!.id, status };
      if (status === 'confirmed') update.confirmed_at = new Date().toISOString();
      if (status === 'declined') update.declined_at = new Date().toISOString();
      const { error } = await supabase
        .from('session_attendance' as any)
        .upsert(update, { onConflict: 'session_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useJoinRequests(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['join-requests', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests' as any)
        .select('*, profiles:user_id(id, full_name, avatar_url, email)')
        .eq('training_id', trainingId!)
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useAllCoachJoinRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-join-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests' as any)
        .select('*, profiles:user_id(id, full_name, avatar_url, email), trainings(id, name, sport)')
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, trainingId, userId, accept }: {
      requestId: string; trainingId: string; userId: string; accept: boolean;
    }) => {
      await supabase.from('join_requests' as any).update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);
      if (accept) {
        await supabase.from('training_members' as any).upsert({ training_id: trainingId, user_id: userId, role: 'regular' }, { onConflict: 'training_id,user_id' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-join-requests'] });
      qc.invalidateQueries({ queryKey: ['join-requests'] });
      qc.invalidateQueries({ queryKey: ['training-members'] });
    },
  });
}
