import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { usePlayerUpcomingSessions, useMyConfirmation, useUpsertConfirmation, useOpenSpots, useClaimSpot, usePlayerSessionHistory } from '@/hooks/usePlayerData';
import { formatDistanceToNow, format, parseISO, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function relativeSessionTime(dateStr: string, startTime: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Today at ${startTime.slice(0, 5)}`;
  if (isTomorrow(date)) return `Tomorrow at ${startTime.slice(0, 5)}`;
  return `${format(date, 'EEE d MMM')} at ${startTime.slice(0, 5)}`;
}

function ConfirmButtons({ sessionId }: { sessionId: string }) {
  const { data: confirmation, isLoading } = useMyConfirmation(sessionId);
  const upsert = useUpsertConfirmation();
  const [justTapped, setJustTapped] = useState<'confirmed' | 'declined' | null>(null);

  async function tap(status: 'confirmed' | 'declined') {
    setJustTapped(status);
    await upsert.mutateAsync({ sessionId, status });
    toast.success(status === 'confirmed' ? "You're in! 🎉" : "Noted. Hope to see you next time.");
  }

  if (isLoading) return <div className="h-14 animate-pulse rounded-xl bg-muted" />;

  const current = confirmation?.status;

  if (current === 'confirmed' || current === 'declined') {
    const isConfirmed = current === 'confirmed';
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          {isConfirmed
            ? <CheckCircle2 className="h-5 w-5 text-success" />
            : <XCircle className="h-5 w-5 text-destructive" />}
          <span className="text-sm font-semibold text-foreground">
            {isConfirmed ? "You're confirmed" : "Can't make it"}
          </span>
        </div>
        <button
          onClick={() => tap(isConfirmed ? 'declined' : 'confirmed')}
          className="text-xs font-medium text-primary min-h-[44px] px-2"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => tap('confirmed')}
        disabled={upsert.isPending}
        className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold min-h-[56px] transition-all active:scale-95 ${
          justTapped === 'confirmed' && upsert.isPending
            ? 'bg-success/80 text-success-foreground scale-95'
            : 'bg-success text-success-foreground'
        } disabled:opacity-60`}
      >
        <CheckCircle2 className="h-5 w-5" />
        I'm coming
      </button>
      <button
        onClick={() => tap('declined')}
        disabled={upsert.isPending}
        className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold min-h-[56px] transition-all active:scale-95 ${
          justTapped === 'declined' && upsert.isPending
            ? 'bg-destructive/80 text-destructive-foreground scale-95'
            : 'bg-destructive text-destructive-foreground'
        } disabled:opacity-60`}
      >
        <XCircle className="h-5 w-5" />
        Can't make it
      </button>
    </div>
  );
}

function NextSessionCard({ session }: { session: any }) {
  const group = session.groups;
  const coach = group?.profiles;
  const sportIcon = SPORT_ICONS[group?.sport] ?? '🎯';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sportIcon}</span>
          <div>
            <h2 className="font-bold text-foreground text-lg">{group?.name}</h2>
            <p className="text-sm font-medium text-primary">
              {relativeSessionTime(session.session_date, session.start_time)}
            </p>
          </div>
        </div>
      </div>
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {group?.location}
        </div>
        {coach?.full_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs">👤</span>
            Coach {coach.full_name}
          </div>
        )}
      </div>
      <ConfirmButtons sessionId={session.id} />
    </div>
  );
}

function SessionListItem({ session }: { session: any }) {
  const group = session.groups;
  const { data: confirmation } = useMyConfirmation(session.id);
  const upsert = useUpsertConfirmation();

  const statusDot = confirmation?.status === 'confirmed'
    ? 'bg-success'
    : confirmation?.status === 'declined'
    ? 'bg-destructive'
    : 'bg-warning';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 card-shadow">
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{group?.name}</p>
        <p className="text-xs text-muted-foreground">{relativeSessionTime(session.session_date, session.start_time)}</p>
      </div>
      {confirmation?.status !== 'confirmed' && confirmation?.status !== 'declined' && (
        <div className="flex gap-2">
          <button
            onClick={() => upsert.mutate({ sessionId: session.id, status: 'confirmed' })}
            className="rounded-lg bg-success/10 p-2 text-success min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => upsert.mutate({ sessionId: session.id, status: 'declined' })}
            className="rounded-lg bg-destructive/10 p-2 text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function OpenSpotCard({ spot }: { spot: any }) {
  const claim = useClaimSpot();
  const [claimed, setClaimed] = useState(false);
  const group = spot.groups;
  const session = spot.sessions;
  const sportIcon = SPORT_ICONS[group?.sport] ?? '🎯';

  async function handleClaim() {
    await claim.mutateAsync(spot.id);
    setClaimed(true);
    toast.success("Spot claimed! You're in 🎉");
  }

  if (claimed) {
    return (
      <div className="rounded-2xl border border-success bg-success/5 p-4 text-center">
        <div className="text-2xl mb-1">🎉</div>
        <p className="font-semibold text-foreground text-sm">Spot claimed!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{sportIcon}</span>
        <div>
          <p className="font-semibold text-foreground text-sm">{group?.name}</p>
          <p className="text-xs text-muted-foreground">{group?.sport}</p>
        </div>
      </div>
      <div className="mb-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {session ? relativeSessionTime(session.session_date, session.start_time) : '—'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {group?.location}
        </div>
      </div>
      <button
        onClick={handleClaim}
        disabled={claim.isPending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] disabled:opacity-60 active:scale-95 transition-transform"
      >
        Claim Spot
      </button>
    </div>
  );
}

export default function PlayerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: sessionsLoading } = usePlayerUpcomingSessions();
  const { data: openSpots = [] } = useOpenSpots();
  const { data: history = [] } = usePlayerSessionHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const nextSession = sessions[0];
  const thisWeek = sessions.slice(1, 6);

  function handleJoinGroup() {
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.trim().toUpperCase()}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Player</span>
      </header>

      <main className="flex-1 px-4 py-6 pb-24 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Player'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Your upcoming sessions</p>
        </div>

        {/* Next Session */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Next Session</h2>
          {sessionsLoading ? (
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          ) : nextSession ? (
            <NextSessionCard session={nextSession} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <div className="mb-2 text-3xl">📅</div>
              <p className="font-medium text-foreground">No sessions yet</p>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">Join a group with your invite code</p>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="INVITE CODE"
                  maxLength={8}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                />
                <button
                  onClick={handleJoinGroup}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground min-h-[44px]"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </div>

        {/* This Week */}
        {thisWeek.length > 0 && (
          <div>
            <h2 className="mb-3 font-semibold text-foreground">This Week</h2>
            <div className="space-y-2">
              {thisWeek.map((s: any) => <SessionListItem key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Open Spots */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Open Spots</h2>
          {openSpots.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center card-shadow">
              <div className="mb-2 text-2xl">🔓</div>
              <p className="font-medium text-foreground text-sm">No spots available</p>
              <p className="mt-1 text-xs text-muted-foreground">We'll notify you when one opens!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openSpots.map((spot: any) => <OpenSpotCard key={spot.id} spot={spot} />)}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <button
              onClick={() => setHistoryOpen(v => !v)}
              className="flex w-full items-center justify-between mb-3 min-h-[44px]"
            >
              <h2 className="font-semibold text-foreground">History</h2>
              {historyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {historyOpen && (
              <div className="space-y-2">
                {history.map((s: any) => {
                  const conf = s.confirmations?.[0];
                  const dotColor = conf?.status === 'confirmed' ? 'bg-success' : conf?.status === 'declined' ? 'bg-destructive' : 'bg-muted-foreground/40';
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 card-shadow">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.groups?.name}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(s.session_date), 'EEE d MMM')}</p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{conf?.status ?? '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <PlayerBottomNav />
    </div>
  );
}
