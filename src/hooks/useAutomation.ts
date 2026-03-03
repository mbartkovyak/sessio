import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AUTOMATION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/automation`;

async function callAutomation(action: string, extra?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(AUTOMATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error('Automation call failed');
  return res.json();
}

/** Generate sessions for a single group */
export function useGenerateGroupSessions(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callAutomation('generate_group', { group_id: groupId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['group-sessions', groupId] });
      qc.invalidateQueries({ queryKey: ['sessions-today'] });
      qc.invalidateQueries({ queryKey: ['sessions-week'] });
      const created = data?.sessions_created ?? 0;
      toast.success(created > 0 ? `${created} session${created > 1 ? 's' : ''} generated!` : 'Sessions already up to date');
    },
    onError: () => toast.error('Failed to generate sessions'),
  });
}

/** Generate sessions for ALL active groups */
export function useGenerateAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callAutomation('generate'),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['group-sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions-today'] });
      qc.invalidateQueries({ queryKey: ['sessions-week'] });
      const created = data?.sessions_created ?? 0;
      toast.success(created > 0 ? `${created} session${created > 1 ? 's' : ''} generated!` : 'All sessions are up to date');
    },
    onError: () => toast.error('Failed to generate sessions'),
  });
}

/** Process confirmation window notifications */
export function useProcessConfirmationWindow() {
  return useMutation({
    mutationFn: () => callAutomation('notifications'),
    onSuccess: (data) => {
      const sent = data?.notifications_sent ?? 0;
      if (sent > 0) toast.info(`${sent} confirmation request${sent > 1 ? 's' : ''} sent`);
    },
  });
}

/** Cancel a session and notify players via edge function */
export function useCancelSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callAutomation('cancel_session', { session_id: sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions-today'] });
      qc.invalidateQueries({ queryKey: ['sessions-week'] });
      toast.success('Session cancelled and players notified');
    },
    onError: () => toast.error('Failed to cancel session'),
  });
}

/** Claim a spot using atomic RPC */
export function useClaimSpotRPC() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (spotId: string) => {
      const { data, error } = await supabase.rpc('claim_spot', {
        p_spot_id: spotId,
        p_player_id: user!.id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-open-spots'] });
      qc.invalidateQueries({ queryKey: ['player-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['my-confirmation'] });
    },
  });
}

/** When a player declines: update confirmation + create open spot + notify waitlist */
export function useDeclineAndOpenSpot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, groupId }: { sessionId: string; groupId: string }) => {
      // Update confirmation to declined
      await supabase
        .from('confirmations')
        .upsert({
          session_id: sessionId,
          player_id: user!.id,
          status: 'declined',
          responded_at: new Date().toISOString(),
        }, { onConflict: 'session_id,player_id' });

      // Get session info
      const { data: session } = await supabase
        .from('sessions')
        .select('*, groups(name, start_time)')
        .eq('id', sessionId)
        .single();

      if (!session) return;
      const group = session.groups as any;

      // Create open spot
      const { data: spotData } = await supabase
        .from('open_spots')
        .insert({ session_id: sessionId, group_id: groupId, status: 'open', created_by_decline_of: user!.id })
        .select('id')
        .single();

      // Notify waitlist + flex members
      const { data: waitlistMembers } = await supabase
        .from('group_members')
        .select('player_id')
        .eq('group_id', groupId)
        .in('status', ['waitlist', 'flex']);

      if (waitlistMembers?.length) {
        const dateStr = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = session.start_time?.slice(0, 5);
        await supabase.from('notifications').insert(
          waitlistMembers.map(m => ({
            user_id: m.player_id,
            type: 'spot_opened',
            title: `Spot available! ${group?.name}`,
            message: `${group?.name} — ${dateStr} at ${timeStr}. Tap to claim.`,
            related_session_id: sessionId,
            related_group_id: groupId,
          }))
        );
      }
    },
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: ['my-confirmation', sessionId] });
      qc.invalidateQueries({ queryKey: ['player-upcoming-sessions'] });
      toast.success("Noted. Hope to see you next time.");
    },
    onError: () => toast.error('Failed to update response'),
  });
}
