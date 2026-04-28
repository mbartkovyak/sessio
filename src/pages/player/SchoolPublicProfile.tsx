import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, CalendarDays } from 'lucide-react';
import AppHeader from '@/components/shared/AppHeader';
import {
  useSchool,
  useSchoolUpcomingSessions,
  useIsFavouriteSchool,
  useToggleFavouriteSchool,
  useSchoolReviews,
} from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { sportLabels } from '@/lib/constants';
import UpcomingSessionsCalendar from '@/components/shared/UpcomingSessionsCalendar';
import VenueScroll from '@/components/shared/VenueScroll';
import ReviewsBlock, { type ReviewItem } from '@/components/shared/ReviewsBlock';
import CoachCard from '@/components/shared/CoachCard';
import { SessioLoader } from '@/components/SessioLogo';

export default function SchoolPublicProfile() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { data: school, isLoading: schoolLoading } = useSchool(id);
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useSchoolUpcomingSessions(id);
  const { data: reviewsRaw = [], isLoading: reviewsLoading } = useSchoolReviews(id);
  const { data: isFav } = useIsFavouriteSchool(id);
  const toggleFav = useToggleFavouriteSchool();
  const isLoading = schoolLoading || sessionsLoading || reviewsLoading;

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

  function scrollToSchedule() {
    document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={school?.name ?? t('schoolProfile.title')} back />

      <main className="flex-1 pb-28">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* School hero */}
          {school && (
            <div className="text-center bg-card border border-border rounded-2xl p-6">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                {school.logo_url
                  ? <img src={school.logo_url} alt="" className="h-full w-full object-cover" />
                  : <span className="text-2xl font-bold text-primary">{school.name?.charAt(0)}</span>}
              </div>
              <h2 className="text-xl font-bold text-foreground">{school.name}</h2>
              <div className="flex items-center justify-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <span className="text-warning">★</span>
                    <span className="font-semibold text-foreground">{avgRating}</span>
                    <span>({reviews.length})</span>
                  </span>
                )}
                {school.sport?.length > 0 && <span>{sportLabels(school.sport)}</span>}
                {school.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />{school.city}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons row */}
          {session && id && (
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => toggleFav.mutate({ schoolId: id, isFav: !!isFav })}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold min-h-[40px] transition-colors ${
                  isFav ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-destructive' : ''}`} />
                {isFav ? t('actions.saved') : t('actions.save')}
              </button>
            </div>
          )}

          {/* Reviews — aggregated across coaches */}
          <ReviewsBlock reviews={reviews} />

          {/* About */}
          {school?.description && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('schoolProfile.about')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{school.description}</p>
            </div>
          )}

          {/* Venues */}
          {venues.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">{t('venues.title')}</h3>
              <VenueScroll venues={venues} />
            </div>
          )}

          {/* Schedule */}
          <div id="schedule" className="scroll-mt-20">
            <h3 className="font-semibold text-foreground mb-3">{t('schoolProfile.upcomingSessions')}</h3>
            <UpcomingSessionsCalendar
              sessions={upcomingSessions}
              isLoading={sessionsLoading}
              showCoach
              emptyState={
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('schoolProfile.noUpcomingSessions')}</p>
                </div>
              }
            />
          </div>

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

      {/* Sticky View schedule CTA */}
      {!isLoading && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur safe-area-bottom">
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              onClick={scrollToSchedule}
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
