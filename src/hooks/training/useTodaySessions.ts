import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type SessionTraining = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'type' | 'coach_id'>;
export type UpcomingSession = Tables<'training_sessions'> & { trainings: SessionTraining };

export function useTodaySessions(coachId: string | undefined) {
  return useUpcomingSessions(coachId, 0);
}

export function useUpcomingSessions(coachId: string | undefined, daysAhead: number = 7) {
  return useQuery({
    queryKey: ['upcoming-sessions', coachId, daysAhead],
    enabled: !!coachId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const end = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id)')
        .eq('trainings.coach_id', coachId!)
        .eq('trainings.is_active', true)
        .gte('session_date', today)
        .lte('session_date', end)
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as UpcomingSession[];
    },
  });
}
