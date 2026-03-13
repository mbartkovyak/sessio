import { useNavigate } from 'react-router-dom';
import { useMySchool } from '@/hooks/useSchools';
import CoachBottomNav from '@/components/CoachBottomNav';
import { Users, Calendar, ArrowRight } from 'lucide-react';

export default function SchoolDashboard() {
  const { data: school, isLoading } = useMySchool();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const coaches = (school as any)?.school_members ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">{school?.name ?? 'School'}</h1>
        <p className="text-sm text-muted-foreground">{coaches.length} coach{coaches.length !== 1 ? 'es' : ''}</p>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Coaches</p>
            <p className="text-2xl font-bold text-foreground mt-1">{coaches.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Sport</p>
            <p className="text-xl font-bold text-foreground mt-1 truncate">{school?.sport ?? '—'}</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Coaches</h2>
          {coaches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No coaches yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coaches.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                    {m.profiles?.avatar_url
                      ? <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (m.profiles?.full_name?.[0] ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.profiles?.full_name ?? 'Coach'}</p>
                    <p className="text-xs text-muted-foreground">{m.profiles?.sport ?? ''}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/school/coaches')}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground"
        >
          Manage Coaches
        </button>
      </main>
      <CoachBottomNav />
    </div>
  );
}
