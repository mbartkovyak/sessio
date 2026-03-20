import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getConversationLastSeen } from './useUnreadMessageCount';
import type { Tables } from '@/integrations/supabase/types';

type LatestMessage = Pick<Tables<'training_messages'>, 'training_id' | 'content' | 'created_at' | 'sender_id'> & {
  profiles: Pick<Tables<'profiles'>, 'full_name'> | null;
};

export function useLatestMessages(trainingIds: string[]) {
  return useQuery({
    queryKey: ['latest-messages', ...trainingIds],
    enabled: trainingIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('training_messages')
        .select('training_id, content, created_at, sender_id, profiles:sender_id(full_name)')
        .in('training_id', trainingIds)
        .order('created_at', { ascending: false });
      const map: Record<string, LatestMessage> = {};
      for (const msg of (data ?? []) as LatestMessage[]) {
        if (!map[msg.training_id]) map[msg.training_id] = msg;
      }
      return map;
    },
  });
}

export function isUnread(trainingId: string, lastMsg: any, userId: string): boolean {
  if (!lastMsg || lastMsg.sender_id === userId) return false;
  const seen = getConversationLastSeen(trainingId);
  return !seen || lastMsg.created_at > seen;
}
