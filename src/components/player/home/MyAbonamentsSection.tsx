import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { useMyAbonaments } from '@/hooks/training/useAbonaments';
import { SPORT_ICONS } from '@/lib/constants';

export default function MyAbonamentsSection() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const { data: abonaments = [] } = useMyAbonaments();

  if (abonaments.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('abonaments.title')}
      </h2>
      <div className="space-y-2">
        {abonaments.map((pa: any) => {
          const training = pa.trainings;
          const isPending = pa.status === 'pending';
          const sportIcon = training?.sport ? (SPORT_ICONS[training.sport] ?? '🎯') : '🎯';

          return (
            <button
              key={pa.id}
              onClick={() => training?.id && navigate(`/player/training/${training.id}`)}
              className="w-full rounded-2xl bg-white p-4 shadow-sm text-left transition-all active:scale-[0.98]"
              style={{ border: '1px solid hsl(203 20% 90%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                  {sportIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {training?.name ?? pa.abonament_types?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pa.abonament_types?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      <Ticket className="h-3 w-3" />
                      {t('abonaments.requestPending')}
                    </span>
                  ) : (
                    <div>
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {pa.sessions_remaining}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        / {pa.sessions_total}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
