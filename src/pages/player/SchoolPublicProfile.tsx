import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { useSchool } from '@/hooks/useSchools';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SchoolPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: school } = useSchool(id);

  const { data: coaches = [] } = useQuery({
    queryKey: ['school-coaches', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('school_members' as any)
        .select('*, profiles:coach_id(id, full_name, avatar_url, sport, city, bio)')
        .eq('school_id', id!);
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-foreground truncate">{school?.name ?? 'School Profile'}</h1>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {school && (
            <div className="text-center bg-card border border-border rounded-2xl p-6">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                {school.logo_url
                  ? <img src={school.logo_url} alt="" className="h-full w-full object-cover" />
                  : <span className="text-2xl font-bold text-primary">{school.name?.charAt(0)}</span>}
              </div>
              <h2 className="text-xl font-bold text-foreground">{school.name}</h2>
              {school.city && (
                <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />{school.city}
                </div>
              )}
              {school.description && <p className="mt-3 text-sm text-muted-foreground">{school.description}</p>}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-foreground mb-3">{coaches.length} Coach{coaches.length !== 1 ? 'es' : ''}</h3>
            <div className="space-y-2">
              {coaches.map((m: any) => {
                const coach = m.profiles;
                if (!coach) return null;
                const initials = coach.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/search/coach/${coach.id}`)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden">
                      {coach.avatar_url ? <img src={coach.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{coach.full_name}</p>
                      <p className="text-xs text-muted-foreground">{coach.sport}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
