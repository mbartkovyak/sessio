import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGroupMessages(groupId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['group-messages', groupId],
    enabled: !!groupId,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_messages')
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
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, sender_id: senderId, content })
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .single();
      if (error) throw error;
      return data as any;
    },
    onMutate: async ({ content, senderId }) => {
      await qc.cancelQueries({ queryKey: ['group-messages', groupId] });
      const previous = qc.getQueryData(['group-messages', groupId]);
      const tempMsg = {
        id: `temp-${Date.now()}`,
        group_id: groupId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
        profiles: null,
        _optimistic: true,
      };
      qc.setQueryData(['group-messages', groupId], (old: any[]) =>
        old ? [...old, tempMsg] : [tempMsg]
      );
      return { previous };
    },
    onSuccess: (data) => {
      // Replace optimistic message with real one
      qc.setQueryData(['group-messages', groupId], (old: any[]) =>
        old
          ? old.map(m => m._optimistic ? data : m)
          : [data]
      );
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        qc.setQueryData(['group-messages', groupId], context.previous);
      }
      toast.error('Failed to send message. Please try again.');
    },
  });
}
