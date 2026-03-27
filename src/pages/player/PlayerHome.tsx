import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Clock } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import AppHeader from '@/components/shared/AppHeader';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/training/useTrainings';
import { relativeTime } from '@/components/player/home/relativeTime';
import ConfirmationCard from '@/components/player/home/ConfirmationCard';
import OpenSpotsSection from '@/components/player/home/OpenSpotsSection';
import FavouriteSchoolsSection from '@/components/player/home/FavouriteSchoolsSection';
import ThisWeekSection from '@/components/player/home/ThisWeekSection';
import MyJoinRequests from '@/components/player/home/MyJoinRequests';
import PushNotificationPrompt from '@/components/shared/PushNotificationPrompt';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function PlayerHome() {
  const { t } = useTranslation('player');
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
      <header className="fixed top-0 left-0 right-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center justify-center text-white">
          <SessioLogoCompact />
        </div>
      </header>
      <div className="px-4 py-4 header-gradient" style={{ visibility: 'hidden' }} aria-hidden="true" inert="">
        <div className="max-w-md mx-auto h-7" />
      </div>

      <main className="flex-1 pb-24">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('home.greeting', { name: profile?.full_name?.split(' ')[0] ?? t('home.defaultName') })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingConfirmations.length > 0
                ? t('home.pendingCount', { count: pendingConfirmations.length })
                : t('home.overview')}
            </p>
          </div>

          {/* Confirmation cards — most important */}
          {pendingConfirmations.length > 0 ? (
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
                  <p className="font-semibold text-foreground">{t('home.allSet')}</p>
                  <p className="text-xs text-muted-foreground">{t('home.allConfirmed')}</p>
                </div>
              </div>
              <div className="mt-2 rounded-lg bg-background/60 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t('home.next', { time: relativeTime(nextConfirmed.training_sessions?.session_date, nextConfirmed.training_sessions?.start_time) })}</span>
                </div>
                <p className="text-sm text-foreground font-medium mt-0.5 ml-[22px]">
                  {nextConfirmed.training_sessions?.trainings?.name}
                </p>
              </div>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="card-elevated rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold text-foreground">{t('home.noUpcoming')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('home.noUpcomingDesc')}</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-[0.97] transition-transform"
              >
                {t('home.findCoach')}
              </button>
            </div>
          ) : (
            <div className="card-elevated rounded-2xl p-6 text-center">
              <p className="font-semibold text-foreground">{t('home.freeWeek')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('home.freeWeekDesc')}</p>
            </div>
          )}

          {/* Pending / declined join requests */}
          <MyJoinRequests />

          {/* Push notification prompt */}
          <PushNotificationPrompt />

          {/* Open spots */}
          <OpenSpotsSection />

          {/* Favourite schools */}
          <FavouriteSchoolsSection />

          {/* This week — responded sessions with change option */}
          <ThisWeekSection sessions={respondedSessions} />
        </div>
        )}
      </main>

      <PlayerBottomNav />
    </div>
  );
}
