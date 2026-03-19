import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Heart, Calendar, Clock, Users } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useSchool, useSchoolPublicTrainings, useIsFavouriteSchool, useToggleFavouriteSchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchoolPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: school } = useSchool(id);
  const { data: trainings = [] } = useSchoolPublicTrainings(id);
  const { data: isFav } = useIsFavouriteSchool(id);
  const toggleFav = useToggleFavouriteSchool();

  const coaches = (school as any)?.school_members ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-semibold text-foreground truncate">{school?.name ?? 'School'}</h1>
        {session && (
          <button
            onClick={() => id && toggleFav.mutate({ schoolId: id, isFav: !!isFav })}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
          </button>
        )}
      </header>

      <main className="flex-1 pb-24">
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
                {school.sport && <span>{school.sport}</span>}
                {school.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />{school.city}
                  </span>
                )}
              </div>
              {school.description && <p className="mt-3 text-sm text-muted-foreground">{school.description}</p>}
            </div>
          )}

          {/* Group trainings */}
          {trainings.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Group Trainings</h3>
              <div className="space-y-2">
                {trainings.map((t: any) => {
                  const icon = SPORT_ICONS[t.sport] ?? '🎯';
                  const days = (t.days_of_week ?? [t.day_of_week])
                    .map((d: number) => DAYS[d]).filter(Boolean).join(', ');
                  const coachName = t.coach?.full_name;
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/join/${t.invite_code}`)}
                      className="w-full flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 shadow-sm"
                    >
                      <span className="text-2xl mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{t.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{days} · {t.start_time?.slice(0, 5)}</span>
                          </div>
                          {t.venue && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{t.venue}</span>
                            </div>
                          )}
                          {t.max_players && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3 shrink-0" />
                              <span>{t.max_players} spots</span>
                            </div>
                          )}
                        </div>
                        {coachName && (
                          <p className="mt-1.5 text-xs text-primary font-medium">Coach {coachName}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {trainings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No trainings available yet</p>
            </div>
          )}

          {/* Coaches */}
          {coaches.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">{coaches.length} Coach{coaches.length !== 1 ? 'es' : ''}</h3>
              <div className="space-y-2">
                {coaches.map((m: any) => {
                  const coach = m.coach;
                  if (!coach) return null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/search/coach/${coach.id}`)}
                      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 shadow-sm"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden">
                        {coach.avatar_url ? <img src={coach.avatar_url} alt="" className="h-full w-full object-cover" /> : (coach.full_name?.[0] ?? '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{coach.full_name}</p>
                        <p className="text-xs text-muted-foreground">{coach.sport}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {session && <PlayerBottomNav />}
    </div>
  );
}
