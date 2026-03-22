import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function getLastSeen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('msg_last_seen') ?? '{}'); } catch { return {}; }
}

/** Returns { trainingId: unreadCount } for all given trainings */
export function useUnreadPerChat(trainingIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread-per-chat', user?.id, ...trainingIds],
    enabled: !!user && trainingIds.length > 0,
    queryFn: async () => {
      const lastSeen = getLastSeen();
      const counts: Record<string, number> = {};

      // Batch query: get all messages not sent by me, grouped by training
      const { data } = await supabase
        .from('training_messages')
        .select('training_id, created_at')
        .in('training_id', trainingIds)
        .neq('sender_id', user!.id)
        .order('created_at', { ascending: false });

      for (const msg of data ?? []) {
        const seen = lastSeen[msg.training_id];
        if (!seen || msg.created_at > seen) {
          counts[msg.training_id] = (counts[msg.training_id] ?? 0) + 1;
        }
      }

      return counts;
    },
    refetchInterval: 30000, // refresh every 30s
  });
}
