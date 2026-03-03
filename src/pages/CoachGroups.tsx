import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import CoachBottomNav from '@/components/CoachBottomNav';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CoachGroups() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">My Groups</h1>
        <button
          onClick={() => navigate('/coach/groups/new')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex justify-center pt-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="font-semibold text-foreground">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first group to get started</p>
            <button
              onClick={() => navigate('/coach/groups/new')}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              New Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {groups.map((g: any) => (
              <button
                key={g.id}
                onClick={() => navigate(`/coach/group/${g.id}`)}
                className="rounded-xl border border-border bg-card p-4 text-left card-shadow active:scale-[0.98] transition-transform"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{SPORT_ICONS[g.sport] ?? '🎯'}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {g.level}
                  </span>
                </div>
                <p className="font-semibold text-foreground text-sm leading-tight">{g.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{DAYS[g.day_of_week]} · {g.start_time?.slice(0, 5)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{g.capacity} spots</p>
              </button>
            ))}
            <button
              onClick={() => navigate('/coach/groups/new')}
              className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[120px]"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Group</span>
            </button>
          </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
