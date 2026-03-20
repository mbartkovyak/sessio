import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type SchoolBasic = Pick<Tables<'schools'>, 'id' | 'name'>;

export function useMySchoolBasic(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-school-basic', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, name')
        .eq('owner_id', userId!)
        .maybeSingle();
      return data as SchoolBasic | null;
    },
  });
}
