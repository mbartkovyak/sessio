import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGroupMessages(groupId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['group-messages', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_messages' as any)
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['group-messages', groupId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, qc]);

  return query;
}

export function useSendGroupMessage(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, senderId }: { content: string; senderId: string }) => {
      const { error } = await supabase
        .from('group_messages' as any)
        .insert({ group_id: groupId, sender_id: senderId, content });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
  });
}
