import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTodaySessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sessions-today', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sessions')
        .select(`*, groups!inner(name, sport, location, coach_id, capacity)`)
        .eq('groups.coach_id', user!.id)
        .eq('session_date', today)
        .order('start_time');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWeekSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sessions-week', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data, error } = await supabase
        .from('sessions')
        .select(`*, groups!inner(name, sport, location, coach_id, capacity)`)
        .eq('groups.coach_id', user!.id)
        .gte('session_date', startOfWeek.toISOString().split('T')[0])
        .lte('session_date', endOfWeek.toISOString().split('T')[0]);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`*, groups(name, sport, location, capacity, coach_id)`)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSessionConfirmations(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['confirmations', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confirmations')
        .select(`*, profiles(full_name, avatar_url, email)`)
        .eq('session_id', sessionId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGroupSessions(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-sessions', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('group_id', groupId!)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
