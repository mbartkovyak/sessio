import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Users, ChevronRight } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useMySchoolMembership } from '@/hooks/school/useSchools';
import { useUpcomingSessions, type UpcomingSession } from '@/hooks/training/useTodaySessions';
import TrainingCard from '@/components/shared/TrainingCard';
import Avatar from '@/components/shared/Avatar';
import TodaySessionRow from '@/components/coach/TodaySessionRow';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function CoachOverviewSection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: trainings = [], isLoading } = useTrainings();
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const { data: upcomingSessions = [] } = useUpcomingSessions(profile?.id, 7);
  const { data: schoolMembership } = useMySchoolMembership();
  const trainingIds = trainings.map((t: any) => t.id);
  const { data: totalAthletes = 0 } = useQuery({
    queryKey: ['coach-total-athletes', trainingIds],
    enabled: trainingIds.length > 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('training_members')
        .select('user_id', { count: 'exact', head: true })
        .in('training_id', trainingIds)
        .eq('role', 'regular');
      if (error) throw error;
      return count ?? 0;
    },
  });
  // Coaches in a school cannot create lessons
  const canCreate = isSchoolOwner || !schoolMembership;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Hey, {profile?.full_name?.split(' ')[0] ?? 'Coach'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your training overview</p>
      </div>

      {/* School membership banner */}
      {!isSchoolOwner && schoolMembership?.schools && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm"
          style={{ border: '1px solid hsl(193 30% 50% / 0.15)' }}>
          <Avatar url={(schoolMembership.schools as any).logo_url} name={(schoolMembership.schools as any).name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{(schoolMembership.schools as any).name}</p>
            <p className="text-xs text-muted-foreground">
              {[(schoolMembership.schools as any).sport, (schoolMembership.schools as any).city].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Athletes', value: totalAthletes, style: 'accent' as const },
          { label: 'Lessons', value: trainings.length, style: 'primary' as const },
        ].map(({ label, value, style }) => (
          <div key={label} className={`rounded-2xl p-4 text-center shadow-md ${
            style === 'accent' ? 'bg-accent text-accent-foreground' :
            style === 'primary' ? 'bg-primary text-primary-foreground' :
            'bg-white'
          }`} style={style === 'white' ? { border: '1px solid hsl(203 20% 88%)' } : {}}>
            <div className={`text-2xl font-bold ${style === 'white' ? 'text-foreground' : ''}`}>{value}</div>
            <div className={`text-xs mt-1 font-medium ${
              style === 'white' ? 'text-muted-foreground' : 'opacity-80'
            }`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
          <div className="space-y-2">
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
              let lastDate = '';
              return upcomingSessions.map((session: UpcomingSession) => {
                const showLabel = session.session_date !== lastDate;
                lastDate = session.session_date;
                const label = session.session_date === today ? 'Today'
                  : session.session_date === tomorrow ? 'Tomorrow'
                  : new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                return (
                  <div key={session.id}>
                    {showLabel && <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{label}</p>}
                    <TodaySessionRow session={session} />
                  </div>
                );
              });
            })()}
          </div>
        </section>
      )}

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Join Requests</h2>
          <div className="space-y-2">
            {joinRequests.map((req: any) => {
              const player = req.profiles;
              const training = req.trainings;
              return (
                <div key={req.id} className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar url={player?.avatar_url} name={player?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{player?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{training?.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: true })}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-xs font-bold text-success-foreground min-h-[40px] shadow-sm transition-all active:scale-[0.97]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false })}
                      className="flex items-center justify-center gap-1 rounded-xl bg-muted py-2.5 text-xs font-bold text-muted-foreground min-h-[40px] transition-all active:scale-[0.97]"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My Trainings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Lessons</h2>
          {canCreate && <NewLessonButton />}
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : trainings.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <Users className="h-6 w-6 text-accent mb-3" />
            <h3 className="font-bold text-lg text-foreground mb-1">{canCreate ? 'Create your first lesson' : 'No lessons yet'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{canCreate ? 'Add a recurring lesson and invite your athletes' : 'Your school will assign trainings to you'}</p>
            {canCreate && <NewLessonButton />}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {trainings.slice(0, 4).map((t: any) => (
                <TrainingCard
                  key={t.id}
                  training={t}
                  variant="grid"
                  onClick={() => navigate(`/coach/trainings/${t.id}`)}
                  badge={
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent capitalize">{t.type}</span>
                  }
                  extra={
                    <div className="flex items-center justify-end mt-2 -mb-1">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  }
                />
              ))}
            </div>
            {trainings.length > 4 && (
              <button onClick={() => navigate('/coach/trainings')}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground transition-all active:scale-[0.97]">
                Show all {trainings.length} lessons
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
