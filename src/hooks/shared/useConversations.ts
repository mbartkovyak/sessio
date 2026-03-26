import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// ── Read tracking (DB-backed, localStorage as instant cache) ──

const SEEN_KEY = 'msg_last_seen';
const MANUAL_UNREAD_KEY = 'manual_unread';
const HIDDEN_KEY = 'hidden_chats';

function getSeenMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}'); } catch { return {}; }
}

function getManualUnread(): string[] {
  try { return JSON.parse(localStorage.getItem(MANUAL_UNREAD_KEY) ?? '[]'); } catch { return []; }
}

export function markConversationSeen(conversationId: string) {
  const now = new Date().toISOString();
  // Immediate: localStorage cache for instant UI
  const map = getSeenMap();
  map[conversationId] = now;
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  // Clear manual unread
  const manual = getManualUnread();
  localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify(manual.filter(id => id !== conversationId)));
  // Async: persist to DB (fire-and-forget)
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

export function markAsUnread(conversationId: string) {
  const list = getManualUnread();
  if (!list.includes(conversationId)) localStorage.setItem(MANUAL_UNREAD_KEY, JSON.stringify([...list, conversationId]));
}

export function isManuallyUnread(conversationId: string): boolean {
  return getManualUnread().includes(conversationId);
}

export function hideChat(conversationId: string) {
  // localStorage cache for instant UI
  const hidden: string[] = (() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; } })();
  if (!hidden.includes(conversationId)) localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden, conversationId]));
  // Async: persist to DB
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
  // localStorage cache
  const hidden: string[] = (() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'); } catch { return []; } })();
  if (hidden.includes(conversationId)) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden.filter(id => id !== conversationId)));
  // Async: persist to DB
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

  const seenMap = getSeenMap();
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
        if (payload.new.sender_id === user.id) return; // skip own messages
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
      // Single source of truth: conversation_participants
      // Coaches, athletes, school owners are all added via DB triggers.
      const { data: participations, error: partErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, hidden')
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

      // Fetch training info, DM participants, and messages in parallel
      const trainingIds = convos.filter(c => c.training_id).map(c => c.training_id!);
      const dmConvIds = convos.filter(c => !c.training_id).map(c => c.id);

      const [trainings, otherParticipants, allMessages] = await Promise.all([
        trainingIds.length > 0
          ? supabase.from('trainings').select('id, name, sport, is_active').in('id', trainingIds).then(r => r.data ?? [])
          : Promise.resolve([] as any[]),
        dmConvIds.length > 0
          ? supabase.from('conversation_participants').select('conversation_id, user_id').in('conversation_id', dmConvIds).neq('user_id', user!.id).then(r => r.data ?? [])
          : Promise.resolve([] as any[]),
        supabase.from('messages').select('conversation_id, content, created_at, sender_id, profiles:sender_id(full_name)').in('conversation_id', allConvIds).order('created_at', { ascending: false }).then(r => r.data ?? []),
      ]);

      const trainingMap = new Map((trainings).map(t => [t.id, t]));

      // Get DM partner profiles (depends on otherParticipants above)
      const dmInfo = new Map<string, { userId: string; profile: any }>();
      if (otherParticipants.length > 0) {
        const otherIds = [...new Set(otherParticipants.map(p => p.user_id))];
        let profileMap = new Map<string, any>();
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, sport')
            .in('id', otherIds);
          profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
        }

        for (const p of otherParticipants) {
          dmInfo.set(p.conversation_id, { userId: p.user_id, profile: profileMap.get(p.user_id) });
        }
      }

      const latestMap = new Map<string, any>();
      for (const msg of allMessages ?? []) {
        if (!latestMap.has(msg.conversation_id)) latestMap.set(msg.conversation_id, msg);
      }

      // Build seenMap and hiddenSet from DB data
      const seenMap: Record<string, string> = {};
      const hiddenSet = new Set<string>();
      for (const p of participations ?? []) {
        if (p.last_read_at) seenMap[p.conversation_id] = p.last_read_at;
        if (p.hidden) hiddenSet.add(p.conversation_id);
      }

      const result: ConversationInfo[] = [];
      for (const conv of convos) {
        const latest = latestMap.get(conv.id);
        const seen = seenMap[conv.id];
        let unreadCount = 0;
        for (const msg of allMessages ?? []) {
          if (msg.conversation_id !== conv.id) continue;
          if (msg.sender_id === user!.id) continue;
          if (seen && msg.created_at <= seen) break;
          unreadCount++;
        }

        // Archived DMs: skip if no unread, show if new messages arrived
        if (hiddenSet.has(conv.id) && unreadCount === 0) continue;

        if (conv.training_id) {
          const training = trainingMap.get(conv.training_id);
          result.push({
            id: conv.id,
            type: 'training',
            name: training?.name ?? i18n.t('chat.trainingFallback'),
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
            name: otherProfile?.full_name ?? i18n.t('chat.userFallback'),
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
        .select('conversation_id, last_read_at')
        .eq('user_id', user!.id);
      const convIds = (parts ?? []).map(p => p.conversation_id);
      if (convIds.length === 0) return getManualUnread().length;

      const seenMap: Record<string, string> = {};
      for (const p of parts ?? []) {
        if (p.last_read_at) seenMap[p.conversation_id] = p.last_read_at;
      }
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
          qc.invalidateQueries({ queryKey: ['my-conversations'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return count;
}
