import { useNavigate } from 'react-router-dom';
import { Plus, Users, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { useSchoolTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import TrainingCard from '@/components/shared/TrainingCard';
import { CheckCircle2 } from 'lucide-react';

export default function SchoolOverviewSection({ school }: { school: { id: string; name: string } }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: fullSchool } = useMySchool();
  const { data: trainings = [], isLoading: trainingsLoading } = useSchoolTrainings(fullSchool?.id);
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const schoolMembers = (fullSchool)?.school_members ?? [];
  const isSelfCoach = schoolMembers.some((m: any) => m.coach_id === profile?.id);

  async function addSelfAsCoach() {
    if (!fullSchool?.id || !profile?.id) return;
    const { error } = await supabase
      .from('school_members')
      .insert({ school_id: fullSchool.id, coach_id: profile.id, status: 'approved' });
    if (error) toast.error(error.message);
    else {
      toast.success("Added! You can now create trainings.");
      qc.invalidateQueries({ queryKey: ['my-school'] });
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
        <p className="text-sm text-muted-foreground">School overview</p>
      </div>

      {/* Coaches in school */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Coaches</h2>
          <button onClick={() => navigate('/school/profile')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
            <Plus className="h-4 w-4" /> Invite
          </button>
        </div>
        {schoolMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No coaches yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schoolMembers.map((m: any) => {
              const coach = m.coach;
              const isMe = m.coach_id === profile?.id;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Avatar url={coach?.avatar_url} name={coach?.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {coach?.full_name ?? 'Coach'}{isMe && <span className="text-primary ml-1">(you)</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!isSelfCoach && (
          <button
            onClick={addSelfAsCoach}
            className="w-full rounded-xl border-2 border-dashed border-primary/30 p-3 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors mt-2"
          >
            <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Add myself as coach
          </button>
        )}
      </div>

      {/* Join Requests (athletes) */}
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
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: true })}
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false })}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]">
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trainings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Lessons</h2>
          <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
        {trainingsLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : trainings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No lessons yet — create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {trainings.map((t: any) => (
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
            <button onClick={() => navigate('/coach/trainings/new')}
              className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[100px]">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">New Lesson</span>
            </button>
          </div>
        )}
      </div>

      {/* School settings */}
      <div className="rounded-xl border border-border bg-card">
        <button onClick={() => navigate('/school/profile')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
          <Settings className="h-4 w-4 text-muted-foreground" /> School Settings
        </button>
      </div>
    </div>
  );
}
