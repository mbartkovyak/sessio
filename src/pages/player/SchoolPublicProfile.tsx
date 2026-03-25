import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, Calendar, Users } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useSchool, useSchoolPublicTrainings, useIsFavouriteSchool, useToggleFavouriteSchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import TrainingCard from '@/components/shared/TrainingCard';
import Avatar from '@/components/shared/Avatar';

export default function SchoolPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data: school } = useSchool(id);
  const { data: trainings = [] } = useSchoolPublicTrainings(id);
  const { data: isFav } = useIsFavouriteSchool(id);
  const toggleFav = useToggleFavouriteSchool();

  const coaches = ((school as any)?.school_members ?? []).filter((m: any) => m.coach);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={school?.name ?? 'School'}
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
                {trainings.map((t: any) => (
                    <TrainingCard
                      key={t.id}
                      training={t}
                      onClick={() => navigate(`/join/${t.invite_code}`)}
                      extra={
                        <>
                          {t.max_players && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3 shrink-0" />
                              <span>{t.max_players} spots</span>
                            </div>
                          )}
                          {t.coach?.full_name && (
                            <p className="mt-1.5 text-xs text-primary font-medium">Coach {t.coach.full_name}</p>
                          )}
                        </>
                      }
                    />
                ))}
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
                      <Avatar url={coach.avatar_url} name={coach.full_name} size="md" />
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
