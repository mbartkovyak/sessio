import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Heart, CalendarDays } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useSchool, useSchoolUpcomingSessions, useIsFavouriteSchool, useToggleFavouriteSchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { sportLabels } from '@/lib/constants';
import UpcomingSessionsCalendar from '@/components/shared/UpcomingSessionsCalendar';
import CoachCard from '@/components/shared/CoachCard';
import { SessioLoader } from '@/components/SessioLogo';

export default function SchoolPublicProfile() {
  const { t } = useTranslation('player');
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { data: school, isLoading: schoolLoading } = useSchool(id);
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useSchoolUpcomingSessions(id);
  const { data: isFav } = useIsFavouriteSchool(id);
  const isLoading = schoolLoading || sessionsLoading;
  const toggleFav = useToggleFavouriteSchool();

  const coaches = ((school as any)?.school_members ?? []).filter((m: any) => m.coach);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={school?.name ?? t('schoolProfile.title')}
        back
        right={session ? (
          <button
            onClick={() => id && toggleFav.mutate({ schoolId: id, isFav: !!isFav })}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Heart className={`h-4.5 w-4.5 ${isFav ? 'fill-destructive text-destructive' : 'text-white/70'}`} />
          </button>
        ) : undefined}
      />

      <main className="flex-1 pb-24">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : (
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* School info */}
          {school && (
            <div className="text-center bg-card border border-border rounded-2xl p-6">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                {school.logo_url
                  ? <img src={school.logo_url} alt="" className="h-full w-full object-cover" />
                  : <span className="text-2xl font-bold text-primary">{school.name?.charAt(0)}</span>}
              </div>
              <h2 className="text-xl font-bold text-foreground">{school.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
                {school.sport?.length > 0 && <span>{sportLabels(school.sport)}</span>}
                {school.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />{school.city}
                  </span>
                )}
              </div>
              {school.description && <p className="mt-3 text-sm text-muted-foreground">{school.description}</p>}
            </div>
          )}

          {/* Upcoming sessions */}
          <div>
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

      {session && <PlayerBottomNav />}
    </div>
  );
}
