import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { useMyAbonaments, isAbonamentActive, daysRemaining } from '@/hooks/training/useAbonaments';
import { format } from 'date-fns';

export default function MyAbonamentsSection() {
  const { t } = useTranslation('player');
  const { data: abonaments = [] } = useMyAbonaments();

  // Only show effectively active ones
  const activePasses = abonaments.filter((pa: any) => isAbonamentActive(pa));
  if (activePasses.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('abonaments.title')}
      </h2>
      <div className="space-y-2">
        {activePasses.map((pa: any) => {
          const school = pa.schools;
          const hasSessionLimit = pa.sessions_remaining != null;
          const daysLeft = pa.expires_at ? daysRemaining(pa.expires_at) : null;
          const startDate = pa.activated_at ?? pa.created_at;

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
                    {daysLeft != null && ` · ${daysLeft}d`}
                    {startDate && ` · ${format(new Date(startDate), 'd MMM')}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {hasSessionLimit ? (
                    <div>
                      <p className="text-lg font-bold text-foreground leading-tight">
                        {pa.sessions_remaining}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        / {pa.sessions_total}
                      </p>
                    </div>
                  ) : (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      {t('abonaments.unlimited')}
                    </span>
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
