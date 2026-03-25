import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useCoachReviews, useCoachTrainings } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import TrainingCard from '@/components/shared/TrainingCard';

import Avatar from '@/components/shared/Avatar';

export default function CoachPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', id!).single();
      return data as any;
    },
  });

  const { data: reviews = [] } = useCoachReviews(id);
  const { data: trainings = [] } = useCoachTrainings(id);

  const avgRating = reviews.length >= 3
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={profile?.full_name ?? 'Coach Profile'} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {/* Hero */}
          <div className="bg-card border-b border-border p-6 text-center">
            <div className="mx-auto mb-3">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name}</h2>
            <div className="flex items-center justify-center gap-3 mt-1">
              {profile?.sport && <span className="text-sm text-muted-foreground">{profile.sport}</span>}
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
                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            )}
          </div>

          <div className="px-4 py-4 space-y-6">
            {/* Bio */}
            {profile?.bio && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Available Trainings */}
            {trainings.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">Available Trainings</h3>
                <div className="space-y-2">
                  {trainings.map((t: any) => (
                    <TrainingCard
                      key={t.id}
                      training={t}
                      badge={
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.type === 'individual' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                        }`}>{t.type}</span>
                      }
                      extra={
                        <button
                          onClick={() => navigate(`/join/${t.invite_code}`)}
                          className="mt-3 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground min-h-[36px]"
                        >
                          {t.booking_mode === 'approval' ? 'Request to Join' : 'Join Training'}
                        </button>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Reviews</h3>
              {reviews.length < 3 ? (
                <p className="text-sm text-muted-foreground">Rating visible after 3 reviews</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-foreground">{r.profiles?.full_name ?? 'Athlete'}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                      {r.text && <p className="text-sm text-muted-foreground">{r.text}</p>}
                      {r.coach_response && (
                        <div className="mt-2 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs text-primary font-medium">Coach's response:</p>
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
      </main>

      <PlayerBottomNav />
    </div>
  );
}
