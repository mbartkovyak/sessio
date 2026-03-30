import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { useMyAbonaments } from '@/hooks/training/useAbonaments';

export default function MyAbonamentsSection() {
  const { t } = useTranslation('player');
  const { data: abonaments = [] } = useMyAbonaments();

  if (abonaments.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('abonaments.title')}
      </h2>
      <div className="space-y-2">
        {abonaments.map((pa: any) => {
          const school = pa.schools;
          const isPending = pa.status === 'pending';

          return (
            <div
              key={pa.id}
              className="w-full rounded-2xl bg-white p-4 text-left"
              style={{ border: '1px solid hsl(203 20% 90%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {school?.name ?? pa.abonament_types?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pa.abonament_types?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
