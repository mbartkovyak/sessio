import { format, addDays } from 'date-fns';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import OwnershipFilter, { type OwnershipTab } from '@/components/coach/OwnershipFilter';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { SPORT_ICONS } from '@/lib/constants';
import CalendarGrid from '@/components/shared/CalendarGrid';

function useCoachSessions(coachId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 28), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['coach-calendar-sessions', coachId, today],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, schools(name))')
        .eq('trainings.coach_id', coachId!)
        .gte('session_date', today)
        .lte('session_date', endDate)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export default function CoachCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: coachSessions = [], isLoading } = useCoachSessions(user?.id);
  const [ownershipTab, setOwnershipTab] = useState<OwnershipTab>('all');
  const hasSchoolTrainings = coachSessions.some((s: any) => s.trainings?.school_id);
  const sessions = coachSessions.filter((s: any) =>
    ownershipTab === 'all' ? true : ownershipTab === 'personal' ? !s.trainings?.school_id : !!s.trainings?.school_id
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
          {hasSchoolTrainings && (
            <OwnershipFilter value={ownershipTab} onChange={setOwnershipTab} />
          )}
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <CalendarGrid
            items={sessions}
            getDate={(s: any) => s.session_date}
            isLoading={isLoading}
            emptyState={
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium text-foreground">No upcoming trainings</p>
                <p className="text-sm text-muted-foreground mt-1">Create a training to see your schedule</p>
                <button
                  onClick={() => navigate('/coach/trainings/new')}
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground min-h-[44px]"
                >
                  Create a Training
                </button>
              </div>
            }
            renderItem={(session: any) => {
              const training = session.trainings;
              const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
              const statusColor = session.status === 'cancelled' ? 'bg-destructive/10 border-destructive/20' : 'bg-card';

              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/coach/trainings/${training?.id}`)}
                  className={`w-full flex items-center gap-3 rounded-xl border border-border ${statusColor} px-4 py-3 text-left shadow-sm active:bg-secondary/50 transition-colors`}
                >
                  <span className="text-xl shrink-0">{sportIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{training?.name}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{training?.type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                      </span>
                      {training?.venue && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />{training.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  {ownershipTab === 'all' && hasSchoolTrainings && (
                    training?.school_id
                      ? <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground shrink-0">{training.schools?.name ?? 'School'}</span>
                      : <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">Personal</span>
                  )}
                  {session.status === 'cancelled' && (
                    <span className="text-xs font-medium text-destructive shrink-0">Cancelled</span>
                  )}
                </button>
              );
            }}
          />
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
