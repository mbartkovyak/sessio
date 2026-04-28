import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Star, MapPin, MessageCircle, Heart, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/shared/AppHeader';
import {
  useCoachReviews,
  useCoachUpcomingSessions,
  useIsFavouriteCoach,
  useToggleFavouriteCoach,
} from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sportLabel } from '@/lib/constants';
import UpcomingSessionsCalendar from '@/components/shared/UpcomingSessionsCalendar';
import VenueScroll from '@/components/shared/VenueScroll';
import ReviewsBlock, { type ReviewItem } from '@/components/shared/ReviewsBlock';
import Avatar from '@/components/shared/Avatar';
import { SessioLoader } from '@/components/SessioLogo';

export default function CoachPublicProfile() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id!).single();
      return data as any;
    },
  });

  const { data: reviewsRaw = [], isLoading: reviewsLoading } = useCoachReviews(id);
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useCoachUpcomingSessions(id);
  const { data: isFav } = useIsFavouriteCoach(id);
  const toggleFav = useToggleFavouriteCoach();

  const isLoading = profileLoading || reviewsLoading || sessionsLoading;

  const reviews: ReviewItem[] = useMemo(
    () =>
      reviewsRaw.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        coach_response: r.coach_response,
        reviewer_id: r.reviewer_id,
        reviewer_name: r.profiles?.full_name ?? null,
        coach_id: r.coach_id,
        coach_name: profile?.full_name ?? null,
        created_at: r.created_at,
      })),
    [reviewsRaw, profile?.full_name]
  );

  const avgRating = reviews.length >= 3
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const venues = (profile?.venues as { name: string; address: string }[] | null) ?? [];

  function scrollToSchedule() {
    document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={profile?.full_name ?? t('coachProfile.title')} back />

      <main className="flex-1 pb-28">
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
            <div className="flex items-center justify-center gap-3 mt-1 flex-wrap">
              {avgRating && (
                <span className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">{avgRating}</span>
                  <span className="text-muted-foreground">({reviews.length})</span>
                </span>
              )}
              {profile?.sport && <span className="text-sm text-muted-foreground">{sportLabel(profile.sport)}</span>}
              {profile?.city && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />{profile.city}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons row */}
          {user && id && (
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => toggleFav.mutate({ coachId: id, isFav: !!isFav })}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold min-h-[40px] transition-colors ${
                  isFav ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-destructive' : ''}`} />
                {isFav ? t('actions.saved') : t('actions.save')}
              </button>
              {user.id !== id && (
                <button
                  onClick={() => navigate(`/player/dm/${id}`)}
                  className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground min-h-[40px]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('common:chat.messageCoach')}
                </button>
              )}
            </div>
          )}

          {/* Reviews */}
          <ReviewsBlock reviews={reviews} coachId={id} coachName={profile?.full_name ?? ''} />

          {/* About */}
          {profile?.bio && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('coachProfile.about')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
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
            <h3 className="font-semibold text-foreground mb-3">{t('coachProfile.upcomingSessions')}</h3>
            <UpcomingSessionsCalendar
              sessions={upcomingSessions}
              isLoading={sessionsLoading}
              emptyState={
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('coachProfile.noUpcomingSessions')}</p>
                </div>
              }
            />
          </div>
        </div>
        )}
      </main>

      {/* Sticky View schedule CTA — replaces bottom nav on this page */}
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
