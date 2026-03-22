import { format, addDays } from 'date-fns';
import { MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
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
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, is_active, schools(name))')
        .eq('trainings.coach_id', coachId!)
        .eq('trainings.is_active', true)
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
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, is_active, schools(name), coach:profiles(full_name))')
        .eq('trainings.school_id', schoolId!)
        .eq('trainings.is_active', true)
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
  const { user, profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const { data: coachSessions = [], isLoading: coachLoading } = useCoachSessions(user?.id);
  const { data: schoolSessions = [], isLoading: schoolLoading } = useSchoolSessions(isSchoolOwner ? school?.id : undefined);

  const canCreate = isSchoolOwner || !schoolMembership;

  // School owner: merge own sessions + school sessions (deduplicate)
  const sessions = useMemo(() => {
    if (!isSchoolOwner) return coachSessions;
    const ids = new Set(coachSessions.map((s: any) => s.id));
    return [...coachSessions, ...schoolSessions.filter((s: any) => !ids.has(s.id))];
  }, [coachSessions, schoolSessions, isSchoolOwner]);

  const isLoading = coachLoading || (isSchoolOwner && schoolLoading);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
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
                <p className="text-sm text-muted-foreground mt-1">
                  {canCreate ? 'Create a training to see your schedule' : 'Your school will assign trainings to you'}
                </p>
                {canCreate && (
                  <button
                    onClick={() => navigate('/coach/trainings/new')}
                    className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground min-h-[44px]"
                  >
                    Create a Training
                  </button>
                )}
              </div>
            }
            renderItem={(session: any) => {
              const training = session.trainings;
              const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
              const statusColor = session.status === 'cancelled' ? 'bg-destructive/10 border-destructive/20' : 'bg-card';

              return (
                <div key={session.id} className={`rounded-xl border border-border ${statusColor} shadow-sm overflow-hidden`}>
                  <button
                    onClick={() => navigate(`/coach/trainings/${training?.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-secondary/50 transition-colors"
                  >
                    <span className="text-xl shrink-0">{sportIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">{training?.name}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{training?.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                        {isSchoolOwner && training?.coach?.full_name && training?.coach_id !== user?.id && ` · Coach ${training.coach.full_name}`}
                      </span>
                    </div>
                    {session.status === 'cancelled' && (
                      <span className="text-xs font-medium text-destructive shrink-0">Cancelled</span>
                    )}
                  </button>
                  {training?.venue && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      <MapPin className="h-3 w-3" /> Navigate to {training.venue.split(',')[0]}
                    </a>
                  )}
                </div>
              );
            }}
          />
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
