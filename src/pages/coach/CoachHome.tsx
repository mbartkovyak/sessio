import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, Users, Settings, UserPlus, Calendar } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolView } from '@/contexts/SchoolViewContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import SchoolViewToggle from '@/components/coach/SchoolViewToggle';
import { toast } from 'sonner';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function useTodaySessions(coachId: string | undefined) {
  return useQuery({
    queryKey: ['today-sessions', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('training_sessions' as any)
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id)')
        .eq('trainings.coach_id', coachId!)
        .eq('session_date', today)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useMySchoolBasic(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-school-basic', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('schools' as any)
        .select('id, name')
        .eq('owner_id', userId!)
        .maybeSingle();
      return data as any;
    },
  });
}

function TodaySessionRow({ session }: { session: any }) {
  const navigate = useNavigate();
  const training = session.trainings;
  return (
    <button
      onClick={() => navigate(`/coach/trainings/${training?.id}`)}
      className="flex items-center gap-3 w-full rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm active:bg-secondary/50"
    >
      <span className="text-2xl">{SPORT_ICONS[training?.sport] ?? '🎯'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">{training?.name}</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{training?.type}</span>
        </div>
        <p className="text-xs text-muted-foreground">{session.start_time?.slice(0, 5)} · {training?.venue}</p>
      </div>
    </button>
  );
}

export default function CoachHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { view, setView } = useSchoolView();
  const qc = useQueryClient();
  const { data: trainings = [], isLoading } = useTrainings();
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const { data: todaySessions = [] } = useTodaySessions(profile?.id);
  const { data: school } = useMySchoolBasic(profile?.id);
  const { data: fullSchool } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const schoolMembers = (fullSchool as any)?.school_members ?? [];
  const isSelfCoach = schoolMembers.some((m: any) => m.coach_id === profile?.id);

  async function addSelfAsCoach() {
    if (!fullSchool?.id || !profile?.id) return;
    const { error } = await supabase
      .from('school_members' as any)
      .insert({ school_id: fullSchool.id, coach_id: profile.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Added! You can now create trainings.");
      qc.invalidateQueries({ queryKey: ['my-school'] });
    }
  }

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <SessioLogoCompact />
          <div className="ml-auto"><SchoolViewToggle /></div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {isSchoolOwner && view === 'school' && school ? (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
            <p className="text-sm text-muted-foreground">School overview</p>
          </div>

          {/* Coaches in school */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Coaches</h2>
              <button onClick={() => navigate('/school/coaches')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
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
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                        {coach?.avatar_url ? <img src={coach.avatar_url} alt="" className="h-full w-full object-cover" /> : (coach?.full_name?.[0] ?? '?')}
                      </div>
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

          {/* School management */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            <button onClick={() => navigate('/school/coaches')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
              <Users className="h-4 w-4 text-muted-foreground" /> Manage Coaches
            </button>
            <button onClick={() => navigate('/school/profile')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
              <Settings className="h-4 w-4 text-muted-foreground" /> School Settings
            </button>
          </div>
        </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hey, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋</h1>
            <p className="text-sm text-muted-foreground">Your training overview</p>
          </div>

          {/* School membership banner */}
          {!isSchoolOwner && schoolMembership?.schools && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden shrink-0">
                {(schoolMembership.schools as any).logo_url
                  ? <img src={(schoolMembership.schools as any).logo_url} alt="" className="h-full w-full object-cover" />
                  : (schoolMembership.schools as any).name?.[0] ?? '?'}
              </div>
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

          {/* Today's Sessions */}
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden">
                          {player?.avatar_url ? <img src={player.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(player?.full_name ?? '')}
                        </div>
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
              <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2">
                <Plus className="h-4 w-4" /> New
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
            ) : trainings.length === 0 ? (
              <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
                <Users className="h-6 w-6 opacity-80 mb-2" />
                <h3 className="font-bold text-lg mb-1">Create your first lesson</h3>
                <p className="text-sm opacity-80 mb-4">Add a recurring lesson and invite your athletes</p>
                <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold min-h-[48px]">
                  <Plus className="h-4 w-4" /> New Training
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {trainings.slice(0, 6).map((t: any) => (
                  <button key={t.id} onClick={() => navigate(`/coach/trainings/${t.id}`)}
                    className="rounded-xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-transform">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xl">{SPORT_ICONS[t.sport] ?? '🎯'}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{t.type}</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm leading-tight">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{(t.days_of_week ?? [t.day_of_week]).map((d: number) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).filter(Boolean).join(', ') || '—'} · {t.start_time?.slice(0,5)}</p>
                  </button>
                ))}
                <button onClick={() => navigate('/coach/trainings/new')}
                  className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[100px]">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">New Training</span>
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
