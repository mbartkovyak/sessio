import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Clock } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/training/useTrainings';
import { relativeTime } from '@/components/player/home/relativeTime';
import ConfirmationCard from '@/components/player/home/ConfirmationCard';
import OpenSpotsSection from '@/components/player/home/OpenSpotsSection';
import FavouriteSchoolsSection from '@/components/player/home/FavouriteSchoolsSection';
import ThisWeekSection from '@/components/player/home/ThisWeekSection';
import PushNotificationPrompt from '@/components/shared/PushNotificationPrompt';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function PlayerHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: upcoming = [], isLoading } = useMyUpcomingSessions();

  // Only show pending confirmations for sessions within next 7 days
  const pendingConfirmations = upcoming.filter((a: any) => {
    if (a.status !== 'pending') return false;
    const sessionDate = new Date(a.training_sessions?.session_date + 'T00:00:00');
    return sessionDate.getTime() - Date.now() < SEVEN_DAYS_MS;
  });

  // Responded sessions (confirmed + declined) within next 7 days — can be changed
  const respondedSessions = upcoming.filter((a: any) => {
    if (a.status !== 'confirmed' && a.status !== 'declined') return false;
    const sessionDate = new Date(a.training_sessions?.session_date + 'T00:00:00');
    return sessionDate.getTime() - Date.now() < SEVEN_DAYS_MS;
  });

  const nextConfirmed = respondedSessions.find((a: any) => a.status === 'confirmed');
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

          {/* Push notification prompt */}
          <PushNotificationPrompt />

          {/* Open spots */}
          <OpenSpotsSection />

          {/* Favourite schools */}
          <FavouriteSchoolsSection />

          {/* This week — responded sessions with change option */}
          <ThisWeekSection sessions={respondedSessions} />
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
