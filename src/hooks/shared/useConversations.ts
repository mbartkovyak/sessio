import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

// ── Read tracking (localStorage) ──

const SEEN_KEY = 'msg_last_seen';
const MANUAL_UNREAD_KEY = 'manual_unread';
const HIDDEN_KEY = 'hidden_chats';

// One-time migration: clear old training-ID-keyed data (now uses conversation IDs)
if (!localStorage.getItem('_msg_migrated_v2')) {
  localStorage.removeItem(SEEN_KEY);
  localStorage.removeItem(MANUAL_UNREAD_KEY);
  localStorage.removeItem(HIDDEN_KEY);
  localStorage.setItem('_msg_migrated_v2', '1');
}

function getSeenMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}'); } catch { return {}; }
}

export function markConversationSeen(conversationId: string) {
  const map = getSeenMap();
  map[conversationId] = new Date().toISOString();
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  // Clear manual unread
  const manual = getManualUnread();
  localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify(manual.filter(id => id !== conversationId)));
}

export function getConversationLastSeen(conversationId: string): string | null {
  return getSeenMap()[conversationId] ?? null;
}

function getManualUnread(): string[] {
  try { return JSON.parse(localStorage.getItem(MANUAL_UNREAD_KEY) ?? '[]'); } catch { return []; }
}

export function markAsUnread(conversationId: string) {
  const list = getManualUnread();
  if (!list.includes(conversationId)) localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify([...list, conversationId]));
}

function getHiddenChats(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; }
}

export function hideChat(conversationId: string) {
  const hidden = getHiddenChats();
  if (!hidden.includes(conversationId)) localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden, conversationId]));
}

export function isUnread(conversationId: string, lastMsg: any, userId: string): boolean {
  if (!lastMsg || lastMsg.sender_id === userId) return false;
  const seen = getConversationLastSeen(conversationId);
  return !seen || lastMsg.created_at > seen;
}

export function isManuallyUnread(conversationId: string): boolean {
  return getManualUnread().includes(conversationId);
}

// ── Conversation resolution ──

/** Get conversation ID for a training (creates one if needed on first message) */
export function useTrainingConversation(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['conversation-for-training', trainingId],
    enabled: !!trainingId,
    staleTime: 5 * 60 * 1000, // conversation ID doesn't change — cache 5 min
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
    staleTime: 5 * 60 * 1000, // conversation ID doesn't change — cache 5 min
    queryFn: async () => {
      // Find existing conversation where both are participants and no training
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
          // Check which ones are DMs (no training_id)
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

  // Generate ID client-side to avoid SELECT-after-INSERT RLS issue
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('conversations')
    .insert({ id, training_id: trainingId });
  if (error) throw error;
  return id;
}

/** Create a DM conversation if it doesn't exist, return the id */
export async function getOrCreateDMConversation(userId1: string, userId2: string): Promise<string> {
  // Check if DM exists
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

  // Create new DM conversation — generate ID client-side to avoid SELECT-after-INSERT RLS issue
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
    // Clean up orphaned conversation
    await supabase.from('conversations').delete().eq('id', id);
    throw new Error(`Failed to add participants: ${partError.message}`);
  }

  return id;
}

// ── Conversation list (for Chats page) ──

export function useMyConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-conversations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Single source of truth: conversation_participants
      // Coaches, athletes, school owners are all added via DB triggers.
      const { data: participations, error: partErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);
      if (partErr) throw partErr;

      const allConvIds = (participations ?? []).map(p => p.conversation_id);
      if (allConvIds.length === 0) return [];

      // Get conversation details
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, training_id, created_at')
        .in('id', allConvIds);

      if (!convos) return [];

      // Get training info for group chats
      const trainingIds = convos.filter(c => c.training_id).map(c => c.training_id!);
      const { data: trainings } = trainingIds.length > 0
        ? await supabase.from('trainings').select('id, name, sport, is_active').in('id', trainingIds)
        : { data: [] };
      const trainingMap = new Map((trainings ?? []).map(t => [t.id, t]));

      // Get other participants for DMs — always preserve userId even if profile lookup fails
      const dmConvIds = convos.filter(c => !c.training_id).map(c => c.id);
      const dmInfo = new Map<string, { userId: string; profile: any }>();
      if (dmConvIds.length > 0) {
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', dmConvIds)
          .neq('user_id', user!.id);

        const otherIds = [...new Set((otherParticipants ?? []).map(p => p.user_id))];
        let profileMap = new Map<string, any>();
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, sport')
            .in('id', otherIds);
          profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
        }

        for (const p of otherParticipants ?? []) {
          dmInfo.set(p.conversation_id, { userId: p.user_id, profile: profileMap.get(p.user_id) });
        }
      }

      // Get latest message per conversation
      const { data: allMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id, profiles:sender_id(full_name)')
        .in('conversation_id', allConvIds)
        .order('created_at', { ascending: false });

      const latestMap = new Map<string, any>();
      for (const msg of allMessages ?? []) {
        if (!latestMap.has(msg.conversation_id)) latestMap.set(msg.conversation_id, msg);
      }

      // Get unread counts
      const seenMap = getSeenMap();
      const hidden = getHiddenChats();

      const result: ConversationInfo[] = [];
      for (const conv of convos) {
        if (hidden.includes(conv.id)) continue;

        const latest = latestMap.get(conv.id);
        const seen = seenMap[conv.id];
        let unreadCount = 0;
        for (const msg of allMessages ?? []) {
          if (msg.conversation_id !== conv.id) continue;
          if (msg.sender_id === user!.id) continue;
          if (seen && msg.created_at <= seen) break;
          unreadCount++;
        }

        if (conv.training_id) {
          const training = trainingMap.get(conv.training_id);
          result.push({
            id: conv.id,
            type: 'training',
            name: training?.name ?? 'Training',
            sport: training?.sport,
            trainingId: conv.training_id,
            lastMessage: latest ? { content: latest.content, senderName: latest.profiles?.full_name, createdAt: latest.created_at } : undefined,
            unreadCount,
          });
        } else {
          const info = dmInfo.get(conv.id);
          const otherProfile = info?.profile;
          result.push({
            id: conv.id,
            type: 'dm',
            name: otherProfile?.full_name ?? 'User',
            avatarUrl: otherProfile?.avatar_url,
            otherUserId: info?.userId,
            lastMessage: latest ? { content: latest.content, senderName: latest.profiles?.full_name, createdAt: latest.created_at } : undefined,
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

// ── Unread total (for nav badge) — fetches once, updates via realtime only ──

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['unread-total', user?.id],
    enabled: !!user,
    staleTime: 30_000, // refetch every 30s as fallback; realtime handles instant updates
    queryFn: async () => {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);
      const convIds = (parts ?? []).map(p => p.conversation_id);
      if (convIds.length === 0) return getManualUnread().length;

      const seenMap = getSeenMap();
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, created_at, sender_id')
        .in('conversation_id', convIds)
        .neq('sender_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(200);

      let total = 0;
      const counted = new Set<string>();
      for (const msg of msgs ?? []) {
        const seen = seenMap[msg.conversation_id];
        if (!seen || msg.created_at > seen) { total++; counted.add(msg.conversation_id); }
      }
      for (const id of getManualUnread()) {
        if (!counted.has(id)) total++;
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
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return count;
}
