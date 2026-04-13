import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function useBlockedUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['blocked-users', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map(r => r.blocked_id));
    },
  });
}

export function useBlockUser() {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user!.id, blocked_id: blockedId });
      if (error && error.code !== '23505') throw error; // ignore duplicate
    },
    onSuccess: () => {
      toast.success(t('chat.userBlocked'));
      qc.invalidateQueries({ queryKey: ['blocked-users'] });
      qc.invalidateQueries({ queryKey: ['my-conversations'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Failed to block user');
    },
  });
}

export function useUnblockUser() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user!.id)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-users'] });
      qc.invalidateQueries({ queryKey: ['my-conversations'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
