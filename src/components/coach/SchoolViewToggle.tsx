import { useAuth } from '@/contexts/AuthContext';
import { useSchoolView } from '@/contexts/SchoolViewContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useMySchoolName() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school-name', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('name')
        .eq('owner_id', user!.id)
        .maybeSingle();
      return data?.name as string | null;
    },
  });
}

export default function SchoolViewToggle() {
  const { profile } = useAuth();
  const { view, setView } = useSchoolView();
  const { data: schoolName } = useMySchoolName();

  if (profile?.role !== 'school_owner' || !schoolName) return null;

  return (
    <div className="flex rounded-lg bg-secondary p-0.5">
      <button
        onClick={() => setView('coaching')}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          view === 'coaching' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        My coaching
      </button>
      <button
        onClick={() => setView('school')}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          view === 'school' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        {schoolName}
      </button>
    </div>
  );
}
