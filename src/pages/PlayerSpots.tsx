import { useOpenSpots } from '@/hooks/usePlayerData';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { MapPin, Clock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useClaimSpotRPC } from '@/hooks/useAutomation';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function SpotCard({ spot }: { spot: any }) {
  const claim = useClaimSpotRPC();
  const [claimed, setClaimed] = useState(false);
  const group = spot.groups;
  const session = spot.sessions;
  const sportIcon = SPORT_ICONS[group?.sport] ?? '🎯';
  const coach = group?.profiles;

  async function handleClaim() {
    await claim.mutateAsync(spot.id);
    setClaimed(true);
    toast.success("Spot claimed! You're in 🎉");
  }

  if (claimed) {
    return (
      <div className="rounded-2xl border border-success bg-success/5 p-6 text-center card-shadow">
        <div className="text-4xl mb-2">🎉</div>
        <p className="font-bold text-foreground">Spot claimed!</p>
        <p className="text-sm text-muted-foreground mt-1">{group?.name}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sportIcon}</span>
          <div>
            <h3 className="font-bold text-foreground">{group?.name}</h3>
            <p className="text-xs text-muted-foreground">{group?.sport}</p>
          </div>
        </div>
        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
          1 spot left
        </span>
      </div>
      <div className="mb-4 space-y-2">
        {session && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {format(parseISO(session.session_date), 'EEE d MMM')} at {session.start_time?.slice(0, 5)}
          </div>
        )}
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
      <button
        onClick={handleClaim}
        disabled={claim.isPending}
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:scale-95 transition-transform"
      >
        {claim.isPending ? 'Claiming...' : 'Claim Spot'}
      </button>
    </div>
  );
}

export default function PlayerSpots() {
  const { data: openSpots = [], isLoading } = useOpenSpots();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">Open Spots</h1>
        {openSpots.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {openSpots.length} available
          </span>
        )}
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : openSpots.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
            <Unlock className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="font-semibold text-foreground">No spots available</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              We'll notify you when a spot opens in one of your groups!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {openSpots.map((spot: any) => <SpotCard key={spot.id} spot={spot} />)}
          </div>
        )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
