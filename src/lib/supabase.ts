import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
