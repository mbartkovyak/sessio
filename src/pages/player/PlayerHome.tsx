import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Clock } from 'lucide-react';
import { SessioLogoCompact, SessioLoader } from '@/components/SessioLogo';
import PageHeader from '@/components/shared/PageHeader';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useMyUpcomingSessions } from '@/hooks/training/useTrainings';
import { relativeTime } from '@/components/player/home/relativeTime';
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

  // All sessions within next 7 days (athletes are auto-enrolled, can cancel if needed)
  const thisWeekSessions = upcoming.filter((a: any) => {
    const sessionDate = new Date(a.training_sessions?.session_date + 'T00:00:00');
    return sessionDate.getTime() - Date.now() < SEVEN_DAYS_MS;
  });

  const nextConfirmed = thisWeekSessions.find((a: any) => a.status === 'confirmed');
  const hasUpcoming = upcoming.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader className="px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-center text-white">
          <SessioLogoCompact />
        </div>
      </PageHeader>

      <main className="flex-1 pb-24">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('home.greeting', { name: profile?.first_name ?? t('home.defaultName') })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('home.overview')}
            </p>
          </div>

          {/* Status card */}
          {hasUpcoming && nextConfirmed ? (
            <div className="card-elevated rounded-2xl p-5 border-l-4 border-l-success">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t('home.allSet')}</p>
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
          ) : !hasUpcoming ? (
            <div className="card-elevated rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold text-foreground">{t('home.noUpcoming')}</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-3 px-5 py-2 rounded-full bg-yellow-400 text-black text-sm font-semibold"
              >
                {t('home.findCoach')}
              </button>
            </div>
          ) : null}

          {/* Pending / declined join requests */}
          <MyJoinRequests />

          {/* Push notification prompt */}
          <PushNotificationPrompt />

          {/* Open spots */}
          <OpenSpotsSection />

          {/* Favourite schools */}
          <FavouriteSchoolsSection />

          {/* This week — all sessions with cancel option */}
          <ThisWeekSection sessions={thisWeekSessions} />
        </div>
        )}
      </main>

      <PlayerBottomNav />
    </div>
  );
}
