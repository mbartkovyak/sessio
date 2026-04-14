import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Star, MapPin, MessageCircle, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useCoachReviews, useCoachTrainings } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sportLabel } from '@/lib/constants';
import TrainingCard from '@/components/shared/TrainingCard';

import Avatar from '@/components/shared/Avatar';
import { SessioLoader } from '@/components/SessioLogo';
import ReportDialog from '@/components/shared/ReportDialog';

export default function CoachPublicProfile() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reportReview, setReportReview] = useState<{ id: string; reviewerId: string } | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id!).single();
      return data as any;
    },
  });

  const { user } = useAuth();
  const { data: reviews = [], isLoading: reviewsLoading } = useCoachReviews(id);
  const { data: trainings = [], isLoading: trainingsLoading } = useCoachTrainings(id);

  const isLoading = profileLoading || reviewsLoading || trainingsLoading;

  const avgRating = reviews.length >= 3
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={profile?.full_name ?? t('coachProfile.title')} back />

      <main className="flex-1 pb-24">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Hero */}
          <div className="text-center bg-card border border-border rounded-2xl p-6">
            <div className="mx-auto mb-3 w-fit">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
            <div className="flex items-center justify-center gap-3 mt-1">
              {profile?.sport && <span className="text-sm text-muted-foreground">{sportLabel(profile.sport)}</span>}
              {profile?.city && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />{profile.city}
                </span>
              )}
            </div>
            {avgRating && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="font-semibold text-foreground">{avgRating}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} {t('coachProfile.reviews').toLowerCase()})</span>
              </div>
            )}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">{profile.bio}</p>
            )}
            {user && id && user.id !== id && (
              <button
                onClick={() => navigate(`/player/dm/${id}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 min-h-[40px]"
              >
                <MessageCircle className="h-4 w-4" />
                {t('common:chat.messageCoach')}
              </button>
            )}
          </div>

          <div className="space-y-6">

            {/* Available Trainings */}
            {trainings.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">{t('coachProfile.availableTrainings')}</h3>
                <div className="space-y-2">
                  {trainings.map((tr: any) => (
                    <TrainingCard
                      key={tr.id}
                      training={tr}
                      badge={
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                          tr.type === 'individual' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                        }`}>{t(`common:trainingType.${tr.type}`)}</span>
                      }
                      extra={
                        <button
                          onClick={() => navigate(`/join/${tr.invite_code}`)}
                          className="mt-3 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground min-h-[36px]"
                        >
                          {tr.booking_mode === 'approval' ? t('coachProfile.requestToJoin') : t('coachProfile.joinTraining')}
                        </button>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">{t('coachProfile.reviews')}</h3>
              {reviews.length < 3 ? (
                <p className="text-sm text-muted-foreground">{t('coachProfile.reviewsMinimum')}</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-foreground">{r.profiles?.full_name ?? t('coachProfile.athlete')}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                            ))}
                          </div>
                          {r.reviewer_id !== user?.id && (
                            <button
                              onClick={() => setReportReview({ id: r.id, reviewerId: r.reviewer_id })}
                              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                              title={t('coachProfile.reportReview')}
                            >
                              <Flag className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                      {r.text && <p className="text-sm text-muted-foreground">{r.text}</p>}
                      {r.coach_response && (
                        <div className="mt-2 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs text-primary font-medium">{t('coachProfile.coachResponse')}</p>
                          <p className="text-xs text-muted-foreground">{r.coach_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </main>

      <PlayerBottomNav />

      <ReportDialog
        open={!!reportReview}
        onClose={() => setReportReview(null)}
        contentType="review"
        contentId={reportReview?.id ?? ''}
        flaggedUserId={reportReview?.reviewerId ?? ''}
      />
    </div>
  );
}
