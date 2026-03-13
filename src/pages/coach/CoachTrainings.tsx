import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useTrainings } from '@/hooks/useTrainings';

const SPORT_ICONS: Record<string, string> = { Tennis:'🎾',Swimming:'🏊',Running:'🏃',Fitness:'💪',Yoga:'🧘',Football:'⚽',Badminton:'🏸',Boxing:'🥊',Other:'🎯' };
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function CoachTrainings() {
  const navigate = useNavigate();
  const { data: trainings = [], isLoading } = useTrainings();
  const [search, setSearch] = useState('');
  const filtered = trainings.filter((t: any) => t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">Trainings</h1>
            <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground min-h-[40px]">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trainings..." className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </header>
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-2">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16"><div className="text-4xl mb-3">🏋️</div><p className="font-medium text-foreground">No trainings yet</p><button onClick={() => navigate('/coach/trainings/new')} className="mt-4 text-sm font-medium text-primary">Create your first training →</button></div>
          ) : filtered.map((t: any) => (
            <button key={t.id} onClick={() => navigate(`/coach/trainings/${t.id}`)}
              className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm active:bg-secondary/50">
              <span className="text-2xl">{SPORT_ICONS[t.sport] ?? '🎯'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{t.name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{t.type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{DAYS[t.day_of_week]} · {t.start_time?.slice(0,5)} · {t.venue}</p>
                {t.schools?.name && <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{t.schools.name}</span>}
              </div>
            </button>
          ))}
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
