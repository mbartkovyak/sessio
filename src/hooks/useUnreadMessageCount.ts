import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'msg_last_seen';

function getLastSeen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}

export function markGroupSeen(groupId: string) {
  const map = getLastSeen();
  map[groupId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  async function fetch() {
    if (!user) return;
    const lastSeen = getLastSeen();

    // Get all groups user belongs to (as coach or player)
    const { data: coachGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('coach_id', user.id);

    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('player_id', user.id);

    const groupIds = [
      ...(coachGroups ?? []).map((g: any) => g.id),
      ...(memberGroups ?? []).map((m: any) => m.group_id),
    ];

    if (groupIds.length === 0) { setCount(0); return; }

    let total = 0;
    for (const gid of groupIds) {
      const since = lastSeen[gid];
      let query = supabase
        .from('group_messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', gid)
        .neq('sender_id', user.id);
      if (since) query = query.gt('created_at', since);
      const { count: c } = await query;
      total += c ?? 0;
    }
    setCount(total);
  }

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('unread-msg-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
