import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePlayerGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-groups', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, groups(*)')
        .eq('player_id', user!.id)
        .in('status', ['active', 'waitlist', 'flex']);
      if (error) throw error;
      return (data ?? []).map((m: any) => m.groups).filter(Boolean);
    },
  });
}
