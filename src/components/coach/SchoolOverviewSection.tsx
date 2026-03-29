import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, CheckCircle2, UserPlus, Users, X } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import { useMySchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useSchoolTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import Avatar from '@/components/shared/Avatar';
import TrainingCard from '@/components/shared/TrainingCard';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import { useTranslation } from 'react-i18next';
import { sportLabel } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

export default function SchoolOverviewSection({ school }: { school: { id: string; name: string } }) {
  const { t } = useTranslation('school');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: fullSchool } = useMySchool();
  const { data: trainings = [], isLoading: trainingsLoading } = useSchoolTrainings(fullSchool?.id);
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const respondSchool = useRespondSchoolMember();
  const [showInvite, setShowInvite] = useState(false);

  const coaches = fullSchool?.school_members ?? [];
  const pendingCoaches = fullSchool?.pending_members ?? [];
  const inviteCode = fullSchool?.invite_code;
  const inviteLink = inviteCode ? `${window.location.origin}/join-school/${inviteCode}` : '';

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
          <p className="text-sm text-muted-foreground">{t('overview.title')}</p>
        </div>
        <button onClick={() => navigate('/school/profile')}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-all active:scale-[0.97] shrink-0 mt-1">
          <Settings className="h-3.5 w-3.5" /> {t('overview.schoolProfile')}
        </button>
      </div>

      {/* Join Requests (athletes) */}
      {joinRequests.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-foreground">{t('overview.joinRequests')}</h2>
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
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: true, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('overview.accept')}
                    </button>
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]">
                      {t('overview.decline')}
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
          <h2 className="font-semibold text-foreground">{t('overview.lessons')}</h2>
          <NewLessonButton />
        </div>
        {trainingsLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : trainings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">{t('overview.noLessons')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {trainings.slice(0, 4).map((tr: any) => (
                <TrainingCard
                  key={tr.id}
                  training={tr}
                  variant="grid"
                  onClick={() => navigate(`/coach/trainings/${tr.id}`)}
                  badge={
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t(`common:trainingType.${tr.type}`)}</span>
                  }
                />
              ))}
            </div>
            {trainings.length > 4 && (
              <button onClick={() => navigate('/coach/trainings')}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground transition-all active:scale-[0.97]">
                {t('overview.showAll', { count: trainings.length })}
              </button>
            )}
          </>
        )}
      </div>

      {/* Coaches */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">{t('dashboard.coachesSection')}</h2>

        {/* Pending coach requests */}
        {pendingCoaches.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-amber-600">{t('dashboard.pendingRequests')} ({pendingCoaches.length})</p>
            {pendingCoaches.map((m: any) => {
              const coach = m.coach;
              return (
                <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{coach?.full_name ?? t('dashboard.coach')}</p>
                      <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => respondSchool.mutate({ memberId: m.id, accept: true })}
                      disabled={respondSchool.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('coaches.approve')}
                    </button>
                    <button
                      onClick={() => respondSchool.mutate({ memberId: m.id, accept: false })}
                      disabled={respondSchool.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                    >
                      <X className="h-3.5 w-3.5" /> {t('coaches.decline')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {coaches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t('dashboard.noCoachesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coaches.map((m: any) => {
              const coach = m.coach;
              const isMe = m.coach_id === user?.id;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {coach?.full_name ?? t('dashboard.coach')}
                      {isMe && <span className="text-xs text-primary ml-1">{t('dashboard.you')}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowInvite(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform"
        >
          <UserPlus className="h-4 w-4" /> {t('dashboard.addCoach')}
        </button>
      </div>

      {/* Invite coach bottom sheet */}
      {showInvite && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowInvite(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-foreground">{t('dashboard.inviteTitle')}</h3>
              <button onClick={() => setShowInvite(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground">{t('dashboard.inviteSteps')}</p>
              <ShareLinkButton url={inviteLink} label={t('coaches.shareInvite')} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
