import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Bell, CheckCircle2, XCircle, MapPin, Clock, Users } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { useMyUpcomingSessions, useUpsertAttendance } from '@/hooks/useTrainings';
import { useMyTrainings } from '@/hooks/useTrainings';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function relativeTime(dateStr: string, startTime: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today at ${startTime.slice(0, 5)}`;
  if (isTomorrow(date)) return `Tomorrow at ${startTime.slice(0, 5)}`;
  return `${format(date, 'EEE d MMM')} at ${startTime.slice(0, 5)}`;
}

function ConfirmationCard({ attendance }: { attendance: any }) {
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [dismissed, setDismissed] = useState(false);
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  if (dismissed || attendance.status !== 'pending') return null;

  async function confirm() {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: 'confirmed' });
    setDismissed(true);
    toast.success("You're in! 🎉");
  }

  async function decline() {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: 'declined' });
    setDismissed(true);
    toast.success("Marked as can't make it");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="text-3xl">{sportIcon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-lg leading-tight">{training?.name}</h3>
          <p className="text-sm font-medium text-primary mt-0.5">
            {relativeTime(session?.session_date, session?.start_time)}
          </p>
        </div>
      </div>
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {training?.venue}
        </div>
        {training?.profiles?.full_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">👤</span>
            {training.profiles.full_name}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={confirm}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-2xl bg-success py-4 text-base font-bold text-success-foreground min-h-[56px] active:scale-95 transition-transform disabled:opacity-60"
        >
          <CheckCircle2 className="h-5 w-5" />
          I'm coming
        </button>
        <button
          onClick={decline}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-destructive/30 bg-destructive/10 py-4 text-base font-bold text-destructive min-h-[56px] active:scale-95 transition-transform disabled:opacity-60"
        >
          <XCircle className="h-5 w-5" />
          Can't make it
        </button>
      </div>
    </div>
  );
}

function OpenSpotsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: spots = [] } = useQuery({
    queryKey: ['training-open-spots', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('training_open_spots' as any)
        .select('*, trainings(id, name, sport, venue, profiles:coach_id(full_name)), training_sessions(session_date, start_time)')
        .eq('status', 'open')
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  if (!spots.length) return null;

  return (
    <div>
      <h2 className="mb-3 font-semibold text-foreground">Open Spots</h2>
      <div className="space-y-3">
        {spots.map((spot: any) => {
          const training = spot.trainings;
          const session = spot.training_sessions;
          const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
          return (
            <div key={spot.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{sportIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{training?.name}</p>
                  {session && (
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(session.session_date, session.start_time)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  const { data } = await supabase.rpc('claim_training_spot' as any, { p_spot_id: spot.id, p_player_id: user!.id });
                  if (data?.success) {
                    toast.success("Spot claimed! 🎉");
                    qc.invalidateQueries({ queryKey: ['training-open-spots'] });
                  } else {
                    toast.error(data?.error === 'already_claimed' ? 'Someone was faster!' : 'Failed to claim spot');
                  }
                }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-95 transition-transform"
              >
                Claim Spot
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlayerHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: upcoming = [], isLoading } = useMyUpcomingSessions();

  const pendingConfirmations = upcoming.filter((a: any) => a.status === 'pending');
  const confirmedSessions = upcoming.filter((a: any) => a.status === 'confirmed');
  const nextConfirmed = confirmedSessions[0];
  const allConfirmed = pendingConfirmations.length === 0 && upcoming.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        <button
          onClick={() => navigate('/player/messages')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
        >
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Hey, {profile?.full_name?.split(' ')[0] ?? 'Player'} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {pendingConfirmations.length > 0
                ? `${pendingConfirmations.length} session${pendingConfirmations.length > 1 ? 's' : ''} need your response`
                : 'Your training overview'}
            </p>
          </div>

          {/* Confirmation cards — most important */}
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-2xl bg-muted" />
          ) : pendingConfirmations.length > 0 ? (
            <div className="space-y-3">
              {pendingConfirmations.slice(0, 3).map((a: any) => (
                <ConfirmationCard key={a.id} attendance={a} />
              ))}
            </div>
          ) : allConfirmed && nextConfirmed ? (
            /* All confirmed — calm state */
            <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">You're all set ✓</p>
                  <p className="text-xs text-muted-foreground">All sessions confirmed</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Next: {relativeTime(nextConfirmed.training_sessions?.session_date, nextConfirmed.training_sessions?.start_time)}</span>
              </div>
              <p className="text-sm text-foreground font-medium mt-1">
                {nextConfirmed.training_sessions?.trainings?.name}
              </p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-medium text-foreground">No upcoming sessions</p>
              <p className="text-sm text-muted-foreground mt-1">Find a coach and join a training</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground min-h-[44px]"
              >
                Find a Coach
              </button>
            </div>
          ) : null}

          {/* Open spots */}
          <OpenSpotsSection />

          {/* This week confirmed sessions */}
          {confirmedSessions.length > 0 && (
            <div>
              <h2 className="mb-3 font-semibold text-foreground">This Week</h2>
              <div className="space-y-2">
                {confirmedSessions.slice(0, 5).map((a: any) => {
                  const session = a.training_sessions;
                  const training = session?.trainings;
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-success" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                        <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
                      </div>
                      <span className="text-xs text-success font-medium">Confirmed</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
