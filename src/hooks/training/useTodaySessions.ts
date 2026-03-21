import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type TodaySessionTraining = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'type' | 'coach_id'>;
type TodaySession = Tables<'training_sessions'> & { trainings: TodaySessionTraining };

export function useTodaySessions(coachId: string | undefined) {
  return useQuery({
    queryKey: ['today-sessions', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id)')
        .eq('trainings.coach_id', coachId!)
        .eq('trainings.is_active', true)
        .eq('session_date', today)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TodaySession[];
    },
  });
}
