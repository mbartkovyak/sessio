import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SPORT_ICONS } from '@/lib/constants';
import { relativeTime } from './relativeTime';
import { useTranslation } from 'react-i18next';

export default function OpenSpotsSection() {
  const { t } = useTranslation('player');
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: spots = [] } = useQuery({
    queryKey: ['training-open-spots', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('training_open_spots')
        .select('*, trainings(id, name, sport, venue, coach:profiles(full_name)), training_sessions(session_date, start_time)')
        .eq('status', 'open')
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  if (!spots.length) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('openSpots.title')}</h2>
      <div className="space-y-3">
        {spots.map((spot: any) => {
          const training = spot.trainings;
          const session = spot.training_sessions;
          const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
          return (
            <div key={spot.id} className="card-elevated rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                  {sportIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{training?.name}</p>
                  {session && (
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(session.session_date, session.start_time)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  const { data } = await supabase.rpc('claim_training_spot', { p_spot_id: spot.id, p_player_id: user!.id });
                  if (data?.success) {
                    toast.success(t('openSpots.claimed'));
                    qc.invalidateQueries({ queryKey: ['training-open-spots'] });
                  } else {
                    toast.error(data?.error === 'already_claimed' ? t('openSpots.tooSlow') : t('openSpots.claimFailed'));
                  }
                }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-[0.97] transition-transform"
              >
                {t('openSpots.claimSpot')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
