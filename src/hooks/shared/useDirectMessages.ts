import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Get all unique DM conversations for the current user */
export function useMyDMConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dm-conversations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all DMs involving me
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Group by other person, keep latest message
      const convos = new Map<string, { userId: string; lastMessage: string; lastAt: string }>();
      for (const msg of data ?? []) {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!convos.has(otherId)) {
          convos.set(otherId, { userId: otherId, lastMessage: msg.content, lastAt: msg.created_at });
        }
      }

      // Fetch profiles for all conversation partners
      const userIds = [...convos.keys()];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, sport')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return [...convos.values()].map(c => ({
        ...c,
        profile: profileMap.get(c.userId) ?? null,
      }));
    },
  });
}

type DM = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export function useDirectMessages(otherUserId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['direct-messages', user?.id, otherUserId],
    enabled: !!user && !!otherUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user!.id})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DM[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || !otherUserId) return;
    const channel = supabase
      .channel(`dm-${[user.id, otherUserId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
      }, (payload: any) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === user.id)
        ) {
          qc.invalidateQueries({ queryKey: ['direct-messages', user.id, otherUserId] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, otherUserId, qc]);

  return query;
}

export function useSendDirectMessage(otherUserId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user!.id, receiver_id: otherUserId, content })
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .single();
      if (error) throw error;
      return data as DM;
    },
    onMutate: async ({ content }) => {
      const key = ['direct-messages', user!.id, otherUserId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      const tempMsg = {
        id: `temp-${Date.now()}`, sender_id: user!.id, receiver_id: otherUserId,
        content, created_at: new Date().toISOString(), profiles: null, _optimistic: true,
      };
      qc.setQueryData(key, (old: any[]) => old ? [...old, tempMsg] : [tempMsg]);
      return { previous };
    },
    onSuccess: (data) => {
      const key = ['direct-messages', user!.id, otherUserId];
      qc.setQueryData(key, (old: any[]) =>
        old ? old.map(m => (m as any)._optimistic ? data : m) : [data]
      );
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        qc.setQueryData(['direct-messages', user!.id, otherUserId], context.previous);
      }
      toast.error('Failed to send message');
    },
  });
}
