import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type CoachProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'>;
type CoachProfileExtended = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'bio' | 'sport' | 'city'>;
type SchoolBasic = Pick<Tables<'schools'>, 'id' | 'name'>;
type MemberProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'email'>;

type TrainingWithSchool = Tables<'trainings'> & { schools: SchoolBasic | null };
type TrainingWithSchoolAndCoach = Tables<'trainings'> & { schools: SchoolBasic | null; coach: CoachProfile | null };
type TrainingDetail = Tables<'trainings'> & { schools: SchoolBasic | null; coach: CoachProfileExtended | null };

type TrainingMemberWithTraining = Tables<'training_members'> & {
  trainings: (Tables<'trainings'> & { coach: CoachProfile | null }) | null;
};
type TrainingMemberWithProfile = Tables<'training_members'> & { profiles: MemberProfile | null };

type SessionAttendanceWithProfile = Tables<'session_attendance'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null;
};

type TrainingBasic = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'cancel_deadline_hours'> & { coach: CoachProfile | null };
type SessionAttendanceWithSession = Tables<'session_attendance'> & {
  training_sessions: (Tables<'training_sessions'> & { trainings: TrainingBasic | null }) | null;
};

type JoinRequestWithProfile = Tables<'join_requests'> & { profiles: MemberProfile | null };
type JoinRequestWithProfileAndTraining = Tables<'join_requests'> & {
  profiles: MemberProfile | null;
  trainings: Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'coach_id'>;
};

export function useTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name)')
        .eq('coach_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchool[];
    },
  });
}

/** All trainings including deleted — for messages (chat persists after deletion) */
export function useAllTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name)')
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchool[];
    },
  });
}

export function useSchoolTrainings(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-trainings', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name), coach:profiles(id, full_name, avatar_url)')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchoolAndCoach[];
    },
  });
}

export function useTraining(id: string | undefined) {
  return useQuery({
    queryKey: ['training', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name), coach:profiles(id, full_name, avatar_url, bio, sport, city)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as TrainingDetail;
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
        .from('training_members')
        .select('*, trainings(*, coach:profiles(id, full_name, avatar_url))')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as TrainingMemberWithTraining[];
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('trainings')
        .insert({ ...values, coach_id: values.coach_id || user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'trainings'>;
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
        .from('trainings')
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
        .from('training_members')
        .select('*, profiles:user_id(id, full_name, avatar_url, email)')
        .eq('training_id', trainingId!);
      if (error) throw error;
      return (data ?? []) as TrainingMemberWithProfile[];
    },
  });
}

export function useRemoveTrainingMember(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('training_members')
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
        .from('training_sessions')
        .select('*')
        .eq('training_id', trainingId!)
        .order('session_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tables<'training_sessions'>[];
    },
  });
}

export function useSessionAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-attendance', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*, profiles:user_id(id, full_name, avatar_url)')
        .eq('session_id', sessionId!);
      if (error) throw error;
      return (data ?? []) as SessionAttendanceWithProfile[];
    },
  });
}

export function useMyUpcomingSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-upcoming-sessions', user?.id],
    enabled: !!user,
    retry: 1,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*, training_sessions(*, trainings(id, name, sport, venue, cancel_deadline_hours, is_active, coach:profiles(id, full_name, avatar_url)))')
        .eq('user_id', user!.id)
        .limit(50);
      if (error) throw error;
      return (data ?? [])
        .filter((d: any) => d.training_sessions && d.training_sessions.session_date >= today && d.training_sessions.trainings?.is_active === true)
        .sort((a: any, b: any) => a.training_sessions.session_date.localeCompare(b.training_sessions.session_date))
        .slice(0, 20) as SessionAttendanceWithSession[];
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
        .from('session_attendance')
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
        .from('join_requests')
        .select('*, profiles:user_id(id, full_name, avatar_url, email)')
        .eq('training_id', trainingId!)
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as JoinRequestWithProfile[];
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
        .from('join_requests')
        .select('*, profiles:user_id(id, full_name, avatar_url, email), trainings!inner(id, name, sport, coach_id)')
        .eq('status', 'pending')
        .eq('trainings.coach_id', user!.id);
      if (error) throw error;
      return (data ?? []) as JoinRequestWithProfileAndTraining[];
    },
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, trainingId, userId, accept }: {
      requestId: string; trainingId: string; userId: string; accept: boolean;
    }) => {
      await supabase.from('join_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);
      if (accept) {
        await supabase.from('training_members').upsert({ training_id: trainingId, user_id: userId, role: 'regular' }, { onConflict: 'training_id,user_id' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-join-requests'] });
      qc.invalidateQueries({ queryKey: ['join-requests'] });
      qc.invalidateQueries({ queryKey: ['training-members'] });
    },
  });
}
