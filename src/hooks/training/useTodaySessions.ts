import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type SessionTraining = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'type' | 'coach_id'> & {
  coach?: { full_name: string } | null;
};
export type UpcomingSession = Tables<'training_sessions'> & { trainings: SessionTraining };

type SessionDetailTraining = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'type' | 'coach_id'> & { invite_code: string | null; max_players: number | null; school_id: string | null };
export type SessionDetail = Tables<'training_sessions'> & { trainings: SessionDetailTraining };

export function useUpcomingSessions(coachId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['upcoming-sessions', coachId, limit],
    enabled: !!coachId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id)')
        .eq('trainings.coach_id', coachId!)
        .eq('trainings.is_active', true)
        .gte('session_date', today)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as UpcomingSession[];
    },
  });
}

export function usePastUnmarkedSessions(coachId?: string, schoolId?: string) {
  return useQuery({
    queryKey: ['past-unmarked-sessions', coachId, schoolId],
    enabled: !!coachId || !!schoolId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      let query = supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, coach:profiles!trainings_coach_id_fkey(full_name))')
        .eq('trainings.is_active', true)
        .eq('status', 'scheduled')
        .is('attendance_marked_at', null)
        .gte('session_date', sevenDaysAgo)
        .lte('session_date', today)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(10);

      if (coachId) query = query.eq('trainings.coach_id', coachId);
      if (schoolId) query = query.eq('trainings.school_id', schoolId);

      const { data, error } = await query;
      if (error) throw error;

      // Only include sessions whose end time has passed
      const now = new Date();
      return ((data ?? []) as UpcomingSession[]).filter((s) => {
        const sessionEnd = new Date(`${s.session_date}T${s.end_time}`);
        return sessionEnd < now;
      });
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-detail', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings(id, name, sport, venue, type, coach_id, invite_code, max_players, school_id)')
        .eq('id', sessionId!)
        .single();
      if (error) throw error;
      return data as SessionDetail;
    },
  });
}

export function useSchoolUpcomingSessions(schoolId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['school-upcoming-sessions', schoolId, limit],
    enabled: !!schoolId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id)')
        .eq('trainings.school_id', schoolId!)
        .eq('trainings.is_active', true)
        .gte('session_date', today)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as UpcomingSession[];
    },
  });
}
