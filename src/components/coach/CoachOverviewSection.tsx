import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useMySchoolMembership } from '@/hooks/school/useSchools';
import { useTodaySessions } from '@/hooks/training/useTodaySessions';
import TrainingCard from '@/components/shared/TrainingCard';
import Avatar from '@/components/shared/Avatar';
import TodaySessionRow from '@/components/coach/TodaySessionRow';

export default function CoachOverviewSection() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: trainings = [], isLoading } = useTrainings();
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const { data: todaySessions = [] } = useTodaySessions(profile?.id);
  const { data: schoolMembership } = useMySchoolMembership();
  // Coaches in a school cannot create lessons
  const canCreate = isSchoolOwner || !schoolMembership;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hey, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋</h1>
        <p className="text-sm text-muted-foreground">Your training overview</p>
      </div>

      {/* School membership banner */}
      {!isSchoolOwner && schoolMembership?.schools && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Lessons', value: trainings.length },
          { label: 'Requests', value: joinRequests.length },
          { label: 'Active', value: trainings.filter((t: any) => t.is_active).length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Today's Lessons */}
      {todaySessions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Today's Trainings</h2>
          <div className="space-y-2">
            {todaySessions.map((session: any) => (
              <TodaySessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Join Requests</h2>
          <div className="space-y-2">
            {joinRequests.map((req: any) => {
              const player = req.profiles;
              const training = req.trainings;
              return (
                <div key={req.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false })}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Trainings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">My Lessons</h2>
          {canCreate && (
            <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
              <Plus className="h-4 w-4" /> New
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : trainings.length === 0 ? (
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <Users className="h-6 w-6 opacity-80 mb-2" />
            <h3 className="font-bold text-lg mb-1">{canCreate ? 'Create your first lesson' : 'No lessons yet'}</h3>
            <p className="text-sm opacity-80 mb-4">{canCreate ? 'Add a recurring lesson and invite your athletes' : 'Your school will assign trainings to you'}</p>
            {canCreate && (
              <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold min-h-[48px]">
                <Plus className="h-4 w-4" /> New Training
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {trainings.slice(0, 6).map((t: any) => (
              <TrainingCard
                key={t.id}
                training={t}
                variant="grid"
                onClick={() => navigate(`/coach/trainings/${t.id}`)}
                badge={
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{t.type}</span>
                }
              />
            ))}
            {canCreate && (
              <button onClick={() => navigate('/coach/trainings/new')}
                className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[100px]">
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">New Training</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
