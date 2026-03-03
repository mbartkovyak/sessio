import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** All groups the player is a member of */
export function usePlayerGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-groups', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`*, groups(*, profiles!groups_coach_id_fkey(full_name, avatar_url))`)
        .eq('player_id', user!.id)
        .eq('status', 'active');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All group memberships (active, waitlist, flex) */
export function usePlayerMemberships() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-memberships', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`*, groups(*, profiles!groups_coach_id_fkey(full_name, avatar_url))`)
        .eq('player_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Upcoming sessions for the player (next 4 weeks) */
export function usePlayerUpcomingSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-upcoming-sessions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const in4Weeks = new Date();
      in4Weeks.setDate(in4Weeks.getDate() + 28);
      const end = in4Weeks.toISOString().split('T')[0];

      // Get group ids for this player
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('player_id', user!.id)
        .eq('status', 'active');

      if (!memberships?.length) return [];

      const groupIds = memberships.map(m => m.group_id);

      const { data, error } = await supabase
        .from('sessions')
        .select(`*, groups(name, sport, location, capacity, profiles!groups_coach_id_fkey(full_name, avatar_url))`)
        .in('group_id', groupIds)
        .gte('session_date', today)
        .lte('session_date', end)
        .eq('status', 'scheduled')
        .order('session_date')
        .order('start_time');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Player's own confirmation for a given session */
export function useMyConfirmation(sessionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-confirmation', sessionId, user?.id],
    enabled: !!sessionId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('confirmations')
        .select('*')
        .eq('session_id', sessionId!)
        .eq('player_id', user!.id)
        .maybeSingle();
      return data;
    },
  });
}

/** Upsert confirmation status */
export function useUpsertConfirmation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: 'confirmed' | 'declined' }) => {
      const { error } = await supabase
        .from('confirmations')
        .upsert({
          session_id: sessionId,
          player_id: user!.id,
          status,
          responded_at: new Date().toISOString(),
        }, { onConflict: 'session_id,player_id' });
      if (error) throw error;
    },
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['my-confirmation', sessionId] });
      qc.invalidateQueries({ queryKey: ['player-upcoming-sessions'] });
    },
  });
}

/** Open spots for the player's groups */
export function useOpenSpots() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-open-spots', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('player_id', user!.id);

      if (!memberships?.length) return [];

      const groupIds = memberships.map(m => m.group_id);

      const { data, error } = await supabase
        .from('open_spots')
        .select(`*, sessions(session_date, start_time, end_time), groups(name, sport, location, profiles!groups_coach_id_fkey(full_name))`)
        .in('group_id', groupIds)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Player's session history */
export function usePlayerSessionHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['player-session-history', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('player_id', user!.id);

      if (!memberships?.length) return [];

      const groupIds = memberships.map(m => m.group_id);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from('sessions')
        .select(`*, groups(name, sport), confirmations!inner(status, player_id)`)
        .in('group_id', groupIds)
        .lt('session_date', yesterday.toISOString().split('T')[0])
        .eq('confirmations.player_id', user!.id)
        .order('session_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Join a group by invite code */
export function useJoinGroupByCode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      // Look up group
      const { data: group, error: ge } = await supabase
        .from('groups')
        .select('*, group_members(id, player_id, status)')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('is_active', true)
        .single();
      if (ge || !group) throw new Error('Group not found. Check the invite code.');

      // Already a member?
      const alreadyMember = group.group_members?.some(
        (m: any) => m.player_id === user!.id
      );
      if (alreadyMember) throw new Error('already_member');

      // Count active members
      const activeCount = group.group_members?.filter((m: any) => m.status === 'active').length ?? 0;
      const status = activeCount >= group.capacity
        ? (group.allow_waitlist ? 'waitlist' : (() => { throw new Error('Group is full and has no waitlist.'); })())
        : 'active';

      const { error: ie } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, player_id: user!.id, status });
      if (ie) throw ie;

      return { group, status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-groups'] });
      qc.invalidateQueries({ queryKey: ['player-memberships'] });
    },
  });
}
