import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type SessionTraining = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'type' | 'coach_id'>;
export type UpcomingSession = Tables<'training_sessions'> & { trainings: SessionTraining };

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
