import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Bell, CheckCircle2, XCircle, MapPin, Clock, Users } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions, useUpsertAttendance } from '@/hooks/training/useTrainings';
import { useMyTrainings } from '@/hooks/training/useTrainings';
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
    <div className="card-elevated-lg rounded-2xl p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {sportIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-base leading-tight">{training?.name}</h3>
          <p className="text-sm font-semibold text-primary mt-0.5">
            {relativeTime(session?.session_date, session?.start_time)}
          </p>
        </div>
      </div>
      <div className="mb-4 space-y-1.5 pl-0.5">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          {training?.venue}
        </div>
        {training?.coach?.full_name && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {training.coach.full_name}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={confirm}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-sm font-bold text-success-foreground min-h-[48px] active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
          I'm coming
        </button>
        <button
          onClick={decline}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 py-3.5 text-sm font-bold text-destructive min-h-[48px] active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          <XCircle className="h-4.5 w-4.5" />
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
        .select('*, trainings(id, name, sport, venue, coach:profiles(full_name)), training_sessions(session_date, start_time)')
        .eq('status', 'open')
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  if (!spots.length) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Open Spots</h2>
      <div className="space-y-3">
        {spots.map((spot: any) => {
          const training = spot.trainings;
          const session = spot.training_sessions;
          const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
          return (
            <div key={spot.id} className="card-elevated rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                  {sportIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{training?.name}</p>
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
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-[0.97] transition-transform"
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

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

  const pendingConfirmations = upcoming.filter((a: any) =>
    a.status === 'pending' && a.training_sessions?.session_date <= threeDaysStr
  );
  const confirmedSessions = upcoming.filter((a: any) => a.status === 'confirmed');
  const nextConfirmed = confirmedSessions[0];
  const allConfirmed = pendingConfirmations.length === 0 && upcoming.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <SessioLogoCompact />
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Hey, {profile?.full_name?.split(' ')[0] ?? 'Athlete'} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingConfirmations.length > 0
                ? `${pendingConfirmations.length} training${pendingConfirmations.length > 1 ? 's' : ''} need your response`
                : 'Your training overview'}
            </p>
          </div>

          {/* Confirmation cards — most important */}
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-52 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : pendingConfirmations.length > 0 ? (
            <div className="space-y-3">
              {pendingConfirmations.slice(0, 3).map((a: any) => (
                <ConfirmationCard key={a.id} attendance={a} />
              ))}
            </div>
          ) : allConfirmed && nextConfirmed ? (
            /* All confirmed — calm state */
            <div className="card-elevated rounded-2xl p-5 border-l-4 border-l-success">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">You're all set</p>
                  <p className="text-xs text-muted-foreground">All trainings confirmed</p>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-background/60 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Next: {relativeTime(nextConfirmed.training_sessions?.session_date, nextConfirmed.training_sessions?.start_time)}</span>
                </div>
                <p className="text-sm text-foreground font-medium mt-0.5 ml-[22px]">
                  {nextConfirmed.training_sessions?.trainings?.name}
                </p>
              </div>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="card-elevated rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold text-foreground">No upcoming trainings</p>
              <p className="text-sm text-muted-foreground mt-1">Find a coach and join a training</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-[0.97] transition-transform"
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
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Week</h2>
              <div className="card-elevated rounded-xl divide-y divide-border">
                {confirmedSessions.slice(0, 5).map((a: any) => {
                  const session = a.training_sessions;
                  const training = session?.trainings;
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="h-2 w-2 rounded-full shrink-0 bg-success" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                        <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
                      </div>
                      <span className="text-xs text-success font-semibold bg-success/8 px-2 py-0.5 rounded-full">Confirmed</span>
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
