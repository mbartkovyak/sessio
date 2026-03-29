import { useEffect } from 'react';
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { toast } from 'sonner';

// ── Types ──

export type MessageWithSender = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
  _optimistic?: boolean;
};

export type ConversationInfo = {
  id: string;
  type: 'training' | 'dm';
  name: string;
  sport?: string;
  avatarUrl?: string | null;
  trainingId?: string;
  otherUserId?: string;
  lastMessage?: { content: string; senderName: string | null; createdAt: string };
  unreadCount: number;
};

// ── Read tracking ──

const MANUAL_UNREAD_KEY = 'manual_unread';
const HIDDEN_KEY = 'hidden_chats';

function getManualUnread(): string[] {
  try { return JSON.parse(localStorage.getItem(MANUAL_UNREAD_KEY) ?? '[]'); } catch { return []; }
}

export function markConversationSeen(conversationId: string, qc?: QueryClient, userId?: string) {
  // Clear manual unread
  const manual = getManualUnread();
  const wasManuallyUnread = manual.includes(conversationId);
  if (wasManuallyUnread) {
    localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify(manual.filter(id => id !== conversationId)));
  }

  // Optimistic cache update (instant UI feedback)
  if (qc && userId) {
    const convos = qc.getQueryData<ConversationInfo[]>(['my-conversations', userId]);
    const oldUnread = convos?.find(c => c.id === conversationId)?.unreadCount ?? 0;

    if (convos) {
      qc.setQueryData<ConversationInfo[]>(['my-conversations', userId],
        convos.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );
    }

    // Subtract both real unreads and manual unread from badge
    const badgeDelta = oldUnread + (wasManuallyUnread ? 1 : 0);
    if (badgeDelta > 0) {
      qc.setQueryData<number>(['unread-total', userId], old =>
        Math.max(0, (old ?? 0) - badgeDelta)
      );
    }
  }

  // DB update (fire-and-forget)
  const now = new Date().toISOString();
  if (userId) {
    supabase
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .then();
  } else {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('conversation_participants')
        .update({ last_read_at: now })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .then();
    });
  }
}

export function markAsUnread(conversationId: string) {
  const list = getManualUnread();
  if (!list.includes(conversationId)) localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify([...list, conversationId]));
}

export function isManuallyUnread(conversationId: string): boolean {
  return getManualUnread().includes(conversationId);
}

export function hideChat(conversationId: string) {
  const hidden: string[] = (() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; } })();
  if (!hidden.includes(conversationId)) localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden, conversationId]));
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase
      .from('conversation_participants')
      .update({ hidden: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .then();
  });
}

export function unhideChat(conversationId: string) {
  const hidden: string[] = (() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; } })();
  if (hidden.includes(conversationId)) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden.filter(id => id !== conversationId)));
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase
      .from('conversation_participants')
      .update({ hidden: false })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .then();
  });
}

/** One-time seed: push existing localStorage read state to DB */
export async function seedReadTrackingToDb() {
  if (localStorage.getItem('_read_tracking_seeded')) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const seenMap: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem('msg_last_seen') ?? '{}'); } catch { return {}; }
  })();
  const hidden: string[] = (() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; } })();
  if (Object.keys(seenMap).length === 0 && hidden.length === 0) {
    localStorage.setItem('_read_tracking_seeded', '1');
    return;
  }

  const updates: Promise<any>[] = [];
  for (const [convId, timestamp] of Object.entries(seenMap)) {
    updates.push(
      supabase.from('conversation_participants')
        .update({ last_read_at: timestamp })
        .eq('conversation_id', convId)
        .eq('user_id', user.id)
    );
  }
  for (const convId of hidden) {
    updates.push(
      supabase.from('conversation_participants')
        .update({ hidden: true })
        .eq('conversation_id', convId)
        .eq('user_id', user.id)
    );
  }
  await Promise.allSettled(updates);
  localStorage.setItem('_read_tracking_seeded', '1');
}

// ── Conversation resolution ──

/** Get conversation ID for a training (creates one if needed on first message) */
export function useTrainingConversation(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['conversation-for-training', trainingId],
    enabled: !!trainingId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('training_id', trainingId!)
        .maybeSingle();
      return data?.id as string | null;
    },
  });
}

/** Get or create DM conversation between current user and another */
export function useDMConversation(otherUserId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dm-conversation', user?.id, otherUserId],
    enabled: !!user && !!otherUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);

      if (myConvos && myConvos.length > 0) {
        const myConvoIds = myConvos.map(c => c.conversation_id);
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId!)
          .in('conversation_id', myConvoIds);

        if (shared && shared.length > 0) {
          const { data: convos } = await supabase
            .from('conversations')
            .select('id')
            .in('id', shared.map(s => s.conversation_id))
            .is('training_id', null);
          if (convos && convos.length > 0) return convos[0].id;
        }
      }
      return null;
    },
  });
}

// ── Messages ──

export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(id, full_name, avatar_url)')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageWithSender[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => { qc.invalidateQueries({ queryKey: ['messages', conversationId] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  return query;
}

/** Find training conversation (auto-created by DB trigger), or create as fallback */
export async function getOrCreateTrainingConversation(trainingId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('training_id', trainingId)
    .maybeSingle();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('conversations')
    .insert({ id, training_id: trainingId });
  if (error) throw error;
  return id;
}

/** Create a DM conversation if it doesn't exist, return the id */
export async function getOrCreateDMConversation(userId1: string, userId2: string): Promise<string> {
  const { data: p1Convos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId1);

  if (p1Convos && p1Convos.length > 0) {
    const ids = p1Convos.map(c => c.conversation_id);
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2)
      .in('conversation_id', ids);

    if (shared && shared.length > 0) {
      const { data: dms } = await supabase
        .from('conversations')
        .select('id')
        .in('id', shared.map(s => s.conversation_id))
        .is('training_id', null)
        .limit(1);
      if (dms && dms.length > 0) return dms[0].id;
    }
  }

  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('conversations')
    .insert({ id });
  if (error) throw error;

  const { error: partError } = await supabase.from('conversation_participants').insert([
    { conversation_id: id, user_id: userId1 },
    { conversation_id: id, user_id: userId2 },
  ]);
  if (partError) {
    await supabase.from('conversations').delete().eq('id', id);
    throw new Error(`Failed to add participants: ${partError.message}`);
  }

  return id;
}

// ── Conversation list (for Chats page) — single RPC ──

export function useMyConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // One-time: seed localStorage read state to DB (fire-and-forget)
  useEffect(() => {
    if (user) seedReadTrackingToDb();
  }, [user?.id]);

  // Realtime: update conversation list when new messages arrive (debounced)
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel('conv-list-messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload: any) => {
        if (payload.new.sender_id === user.id) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['my-conversations', user.id] });
        }, 1000);
      })
      .subscribe();
    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ['my-conversations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_conversations');
      if (error) throw error;

      const manualUnread = getManualUnread();

      const result: ConversationInfo[] = [];
      for (const row of data ?? []) {
        const unreadCount = row.unread_count ?? 0;

        // Hidden conversations: skip unless they have new unreads
        if (row.hidden && unreadCount === 0) continue;

        if (row.training_id) {
          result.push({
            id: row.conversation_id,
            type: 'training',
            name: row.training_name ?? i18n.t('chat.trainingFallback'),
            sport: row.training_sport ?? undefined,
            trainingId: row.training_id,
            lastMessage: row.last_message_at ? {
              content: row.last_message_content ?? '',
              senderName: row.last_message_sender_name,
              createdAt: row.last_message_at,
            } : undefined,
            unreadCount,
          });
        } else {
          result.push({
            id: row.conversation_id,
            type: 'dm',
            name: row.dm_user_name ?? i18n.t('chat.userFallback'),
            avatarUrl: row.dm_avatar_url,
            otherUserId: row.dm_user_id ?? undefined,
            lastMessage: row.last_message_at ? {
              content: row.last_message_content ?? '',
              senderName: row.last_message_sender_name,
              createdAt: row.last_message_at,
            } : undefined,
            unreadCount,
          });
        }
      }

      // Sort by latest message (most recent first)
      result.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? '';
        const bTime = b.lastMessage?.createdAt ?? '';
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return bTime.localeCompare(aTime);
      });

      return result;
    },
  });
}

// ── Unread total (for nav badge) — single RPC ──

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['unread-total', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_unread_count');
      if (error) throw error;
      let total = (data as number) ?? 0;
      // Add manual unread conversations not already counted
      for (const id of getManualUnread()) {
        total++;
      }
      return total;
    },
  });

  // Realtime: bump count when a new message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        if (payload.new.sender_id !== user.id) {
          qc.invalidateQueries({ queryKey: ['unread-total', user.id] });
          qc.invalidateQueries({ queryKey: ['my-conversations', user.id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return count;
}
