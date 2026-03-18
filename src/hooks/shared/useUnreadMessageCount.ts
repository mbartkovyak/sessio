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
      let trainingIds: string[] = [];

      if (profile?.role === 'coach') {
        const { data } = await supabase
          .from('trainings' as any)
          .select('id')
          .eq('coach_id', user!.id);
        trainingIds = (data ?? []).map((t: any) => t.id);
      } else {
        const { data } = await supabase
          .from('training_members' as any)
          .select('training_id')
          .eq('user_id', user!.id);
        trainingIds = (data ?? []).map((m: any) => m.training_id);
      }

      if (trainingIds.length === 0) { setCount(0); return; }

      let total = 0;
      for (const tid of trainingIds) {
        const since = lastSeen[tid];
        let q = supabase
          .from('training_messages' as any)
          .select('*', { count: 'exact', head: true })
          .eq('training_id', tid)
          .neq('sender_id', user!.id);
        if (since) q = q.gt('created_at', since);
        const { count: c } = await q;
        total += c ?? 0;
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
