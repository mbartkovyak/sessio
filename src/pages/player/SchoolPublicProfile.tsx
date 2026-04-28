import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, Star, Ticket } from 'lucide-react';
import AppHeader from '@/components/shared/AppHeader';
import {
  useSchool,
  useIsFavouriteSchool,
  useToggleFavouriteSchool,
  useSchoolReviews,
} from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { sportLabels } from '@/lib/constants';
import VenueScroll from '@/components/shared/VenueScroll';
import ReviewsBlock, { type ReviewItem } from '@/components/shared/ReviewsBlock';
import CoachCard from '@/components/shared/CoachCard';
import { SessioLoader } from '@/components/SessioLogo';

export default function SchoolPublicProfile() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: school, isLoading: schoolLoading } = useSchool(id);
  const { data: reviewsRaw = [], isLoading: reviewsLoading } = useSchoolReviews(id);
  const { data: isFav } = useIsFavouriteSchool(id);
  const toggleFav = useToggleFavouriteSchool();
  const isLoading = schoolLoading || reviewsLoading;

  const coaches = ((school as any)?.school_members ?? []).filter((m: any) => m.coach);
  const venues = ((school as any)?.venues as { name: string; address: string }[] | null) ?? [];

  const reviews: ReviewItem[] = reviewsRaw.map(r => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    coach_response: r.coach_response,
    reviewer_id: r.reviewer_id,
    reviewer_name: r.reviewer_name,
    coach_id: r.coach_id,
    coach_name: r.coach_name,
    created_at: r.created_at,
  }));

  const avgRating = reviews.length >= 3
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={school?.name ?? t('schoolProfile.title')} back />

      <main className="flex-1 pb-28">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5">
          {/* Hero — name on top, logo left + rating/sport/city to its right, description below */}
          {school && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="text-xl font-bold text-foreground">{school.name}</h2>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                  {school.logo_url
                    ? <img src={school.logo_url} alt="" className="h-full w-full object-cover" />
                    : <span className="text-2xl font-bold text-primary">{school.name?.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {avgRating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      <span className="font-semibold text-foreground">{avgRating}</span>
                      <span className="text-muted-foreground">({reviews.length})</span>
                    </div>
                  )}
                  {school.sport?.length > 0 && (
                    <p className="text-sm text-muted-foreground">{sportLabels(school.sport)}</p>
                  )}
                  {school.city && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />{school.city}
                    </p>
                  )}
                </div>
              </div>

              {school.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{school.description}</p>
              )}
            </div>
          )}

          {/* Action buttons row */}
          {session && id && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => toggleFav.mutate({ schoolId: id, isFav: !!isFav })}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold min-h-[36px] whitespace-nowrap transition-colors ${
                  isFav ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-destructive' : ''}`} />
                {isFav ? t('actions.saved') : t('actions.save')}
              </button>
              <button
                onClick={() => navigate(`/s/${id}/passes`)}
                className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-foreground min-h-[36px] whitespace-nowrap"
              >
                <Ticket className="h-3.5 w-3.5" />
                {t('actions.passes')}
              </button>
            </div>
          )}

          {/* Reviews — aggregated across coaches */}
          <ReviewsBlock reviews={reviews} />

          {/* Venues */}
          {venues.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">{t('venues.title')}</h3>
              <VenueScroll venues={venues} />
            </div>
          )}

          {/* Coaches */}
          {coaches.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">{t('schoolProfile.coachCount', { count: coaches.length })}</h3>
              <div className="space-y-2">
                {coaches.map((m: any) => {
                  const coach = m.coach;
                  if (!coach) return null;
                  return <CoachCard key={m.id} coach={coach} />;
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Sticky View schedule CTA — navigates to the schedule sub-route */}
      {!isLoading && id && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur safe-area-bottom">
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              onClick={() => navigate(`/s/${id}/schedule`)}
              className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] active:opacity-80 transition-opacity"
            >
              {t('actions.viewSchedule')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
