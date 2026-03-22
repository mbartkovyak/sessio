import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'msg_last_seen';

function getLastSeen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}

export function markConversationSeen(trainingId: string) {
  const map = getLastSeen();
  map[trainingId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getConversationLastSeen(trainingId: string): string | null {
  return getLastSeen()[trainingId] ?? null;
}

export function useUnreadMessageCount() {
  const { user, profile } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function fetchCount() {
      const lastSeen = getLastSeen();
      const hiddenChats: string[] = (() => {
        try { return JSON.parse(localStorage.getItem('hidden_chats') ?? '[]'); } catch { return []; }
      })();
      let trainingIds: string[] = [];

      if (profile?.role === 'coach' || profile?.role === 'school_owner') {
        // Own trainings
        const { data: own } = await supabase
          .from('trainings')
          .select('id')
          .eq('coach_id', user!.id);
        trainingIds = (own ?? []).map((t: any) => t.id);

        // School owner: also include school trainings
        if (profile?.role === 'school_owner') {
          const { data: school } = await supabase
            .from('schools')
            .select('id')
            .eq('owner_id', user!.id)
            .maybeSingle();
          if (school) {
            const { data: schoolTrainings } = await supabase
              .from('trainings')
              .select('id')
              .eq('school_id', school.id);
            const ids = new Set(trainingIds);
            for (const t of schoolTrainings ?? []) {
              if (!ids.has(t.id)) trainingIds.push(t.id);
            }
          }
        }
      } else {
        // Player: trainings they're a member of
        const { data } = await supabase
          .from('training_members')
          .select('training_id')
          .eq('user_id', user!.id);
        trainingIds = (data ?? []).map((m: any) => m.training_id);
      }

      // Filter out hidden chats
      trainingIds = trainingIds.filter(id => !hiddenChats.includes(id));

      if (trainingIds.length === 0) { setCount(0); return; }

      // Single query: get all unread messages across all trainings
      const { data: messages } = await supabase
        .from('training_messages')
        .select('training_id, created_at')
        .in('training_id', trainingIds)
        .neq('sender_id', user!.id);

      // Count real unread messages
      const chatsWithUnread = new Set<string>();
      let total = 0;
      for (const msg of messages ?? []) {
        const seen = lastSeen[msg.training_id];
        if (!seen || msg.created_at > seen) {
          total++;
          chatsWithUnread.add(msg.training_id);
        }
      }
      // Count manually-marked-unread chats that don't already have real unreads
      const manualUnread: string[] = (() => {
        try { return JSON.parse(localStorage.getItem('manual_unread') ?? '[]'); } catch { return []; }
      })();
      for (const id of manualUnread) {
        if (trainingIds.includes(id) && !chatsWithUnread.has(id)) total++;
      }
      setCount(total);
    }

    fetchCount();
    const channel = supabase
      .channel('unread-training-msg-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'training_messages' }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, profile?.role]);

  return count;
}
