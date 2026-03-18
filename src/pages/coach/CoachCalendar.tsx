import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolView } from '@/contexts/SchoolViewContext';
import { useMySchool } from '@/hooks/school/useSchools';
import CoachBottomNav from '@/components/coach/CoachBottomNav';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function useCoachSessions(coachId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 28), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['coach-calendar-sessions', coachId, today],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions' as any)
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players)')
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

function useSchoolSessions(schoolId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 28), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['school-calendar-sessions', schoolId, today],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions' as any)
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, coach:profiles(full_name))')
        .eq('trainings.school_id', schoolId!)
        .gte('session_date', today)
        .lte('session_date', endDate)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

export default function CoachCalendar() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { view } = useSchoolView();
  const isSchoolView = profile?.role === 'school_owner' && view === 'school';
  const { data: school } = useMySchool();
  const { data: coachSessions = [], isLoading: coachLoading } = useCoachSessions(user?.id);
  const { data: schoolSessions = [], isLoading: schoolLoading } = useSchoolSessions(isSchoolView ? school?.id : undefined);
  const sessions = isSchoolView ? schoolSessions : coachSessions;
  const isLoading = isSchoolView ? schoolLoading : coachLoading;

  const today = new Date();
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i));

  const byDate: Record<string, any[]> = {};
  for (const s of sessions) {
    const d = s.session_date as string;
    if (d) { byDate[d] = byDate[d] ?? []; byDate[d].push(s); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">{isSchoolView ? 'School Calendar' : 'Calendar'}</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const daySessions = byDate[dateKey];
              const today_ = isToday(day);

              return (
                <div key={dateKey} className={`py-3 ${today_ ? '' : 'border-t border-border'}`}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-sm font-semibold ${today_ ? 'text-primary' : 'text-foreground'}`}>
                      {dayLabel(day)}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                  </div>

                  {!daySessions || daySessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 pl-1">No trainings</p>
                  ) : (
                    <div className="space-y-2">
                      {daySessions.map((session: any) => {
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
                            {session.status === 'cancelled' && (
                              <span className="text-xs font-medium text-destructive shrink-0">Cancelled</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {sessions.length === 0 && !isLoading && (
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
          )}
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
