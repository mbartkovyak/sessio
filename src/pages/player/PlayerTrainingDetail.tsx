import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, MessageCircle, LogOut, Users, Ticket } from 'lucide-react';
import CoachCard from '@/components/shared/CoachCard';
import { useTraining, useTrainingMembers, useLeaveTraining } from '@/hooks/training/useTrainings';
import { useMySchoolAbonament, isAbonamentActive } from '@/hooks/training/useAbonaments';
import { useAuth } from '@/contexts/AuthContext';
import { SPORT_ICONS, DAYS_SHORT, dayShortLabel, sportLabel } from '@/lib/constants';
import AppHeader from '@/components/shared/AppHeader';
import VenueLink from '@/components/shared/VenueLink';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { SessioLoader } from '@/components/SessioLogo';

export default function PlayerTrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('player');
  const { user } = useAuth();
  const { data: training, isLoading } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const leave = useLeaveTraining();

  const { data: myAbonament } = useMySchoolAbonament(training?.school_id);

  const isMember = members.some((m: any) => (m.user_id ?? m.profiles?.id) === user?.id);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><SessioLoader /></div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 px-6">
      <p className="text-muted-foreground">{t('trainingDetail.notFound')}</p>
      <button onClick={() => navigate('/player')} className="text-sm text-primary font-medium">{t('trainingDetail.goHome')}</button>
    </div>
  );

  const sportIcon = SPORT_ICONS[training.sport] ?? '🎯';
  const daysLabel = (training.days_of_week ?? [training.day_of_week]).map((d: number) => dayShortLabel(DAYS_SHORT[d])).filter(Boolean).join(', ');
  const coach = (training as any).coach;

  function handleLeave() {
    if (!id || !training) return;
    if (!confirm(t('trainingDetail.leaveConfirm', { name: training.name }))) return;
    leave.mutate(
      { trainingId: id, coachId: training.coach_id, trainingName: training.name },
      { onSuccess: () => navigate('/player', { replace: true }) },
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={training.name} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {/* Hero */}
          <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-5xl mb-3">{sportIcon}</div>
            <h2 className="text-xl font-bold text-foreground">{training.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{sportLabel(training.sport)}</p>
          </div>

          <div className="px-4 py-5 space-y-5">
            {/* Schedule & venue */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-foreground">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{daysLabel}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{training.start_time?.slice(0, 5)} – {training.end_time?.slice(0, 5)}</span>
              </div>
              {training.venue && (
                <div className="flex items-center gap-2.5 text-sm">
                  <VenueLink venue={training.venue} className="text-sm text-foreground" />
                </div>
              )}
              {training.type === 'group' && training.max_players && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{t('join.spotsPerSession', { count: training.max_players, ns: 'common' })}</span>
                </div>
              )}
            </div>

            {/* Coach */}
            {coach && (
              <CoachCard coach={coach} subtitle={t('trainingDetail.coach')} />
            )}

            {/* Player's pass */}
            {isMember && myAbonament && isAbonamentActive(myAbonament) && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{myAbonament.abonament_types?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {myAbonament.sessions_remaining != null
                        ? t('abonaments.remaining', { remaining: myAbonament.sessions_remaining, total: myAbonament.sessions_total })
                        : t('abonaments.unlimited')}
                      {myAbonament.expires_at && ` · ${t('abonaments.expiresOn', { date: new Date(myAbonament.expires_at).toLocaleDateString() })}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Group chat */}
            <button
              onClick={() => navigate(`/player/messages/${id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground min-h-[48px] transition-all active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" />
              {t('trainingDetail.openChat')}
            </button>

            {/* Leave */}
            {isMember && (
              <button
                onClick={handleLeave}
                disabled={leave.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px] hover:bg-destructive/5 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {t('trainingDetail.leave')}
              </button>
            )}
          </div>
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
