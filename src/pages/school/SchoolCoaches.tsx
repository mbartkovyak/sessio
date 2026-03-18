import { useMySchool } from '@/hooks/school/useSchools';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { Users } from 'lucide-react';

export default function SchoolCoaches() {
  const { data: school, isLoading } = useMySchool();
  const coaches = (school as any)?.school_members ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">Coaches</h1>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-3">
        {coaches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No coaches in this school yet.</p>
          </div>
        ) : (
          coaches.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                {m.coach?.avatar_url
                  ? <img src={m.coach.avatar_url} alt="" className="h-full w-full object-cover" />
                  : (m.coach?.full_name?.[0] ?? '?')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{m.coach?.full_name ?? 'Coach'}</p>
                <p className="text-xs text-muted-foreground">{m.coach?.sport ?? ''} · {m.coach?.city ?? ''}</p>
              </div>
            </div>
          ))
        )}
      </main>
      <CoachBottomNav />
    </div>
  );
}
