import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTrainingMessages(trainingId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['training-messages', trainingId],
    enabled: !!trainingId,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_messages' as any)
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .eq('training_id', trainingId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (!trainingId) return;
    const channel = supabase
      .channel(`training-messages-${trainingId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'training_messages',
        filter: `training_id=eq.${trainingId}`,
      }, () => { qc.invalidateQueries({ queryKey: ['training-messages', trainingId] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trainingId, qc]);

  return query;
}

export function useSendTrainingMessage(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, senderId }: { content: string; senderId: string }) => {
      const { data, error } = await supabase
        .from('training_messages' as any)
        .insert({ training_id: trainingId, sender_id: senderId, content })
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .single();
      if (error) throw error;
      return data as any;
    },
    onMutate: async ({ content, senderId }) => {
      await qc.cancelQueries({ queryKey: ['training-messages', trainingId] });
      const previous = qc.getQueryData(['training-messages', trainingId]);
      const tempMsg = {
        id: `temp-${Date.now()}`, training_id: trainingId, sender_id: senderId,
        content, created_at: new Date().toISOString(), profiles: null, _optimistic: true,
      };
      qc.setQueryData(['training-messages', trainingId], (old: any[]) => old ? [...old, tempMsg] : [tempMsg]);
      return { previous };
    },
    onSuccess: (data) => {
      qc.setQueryData(['training-messages', trainingId], (old: any[]) =>
        old ? old.map(m => m._optimistic ? data : m) : [data]
      );
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(['training-messages', trainingId], context.previous);
      toast.error('Failed to send message');
    },
  });
}

export function useUnreadTrainingMessageCount(trainingId: string) {
  const key = `training_seen_${trainingId}`;
  const { data: messages = [] } = useTrainingMessages(trainingId);
  const lastSeen = localStorage.getItem(key);
  if (!lastSeen) return messages.length;
  return messages.filter((m: any) => m.created_at > lastSeen).length;
}

export function markTrainingSeen(trainingId: string) {
  localStorage.setItem(`training_seen_${trainingId}`, new Date().toISOString());
}
