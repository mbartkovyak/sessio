import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`*, profiles(full_name, avatar_url, email)`)
        .eq('group_id', groupId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-members', groupId] }),
  });
}
