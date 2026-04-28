import { useTranslation } from 'react-i18next';
import { Ticket, Clock } from 'lucide-react';
import { useMyAbonaments, isAbonamentActive } from '@/hooks/training/useAbonaments';
import { format } from 'date-fns';

export default function MyAbonamentsSection() {
  const { t } = useTranslation('player');
  const { data: abonaments = [] } = useMyAbonaments();

  const activePasses = abonaments.filter((pa: any) => isAbonamentActive(pa));
  const pendingPasses = abonaments.filter((pa: any) => pa.status === 'pending');

  if (activePasses.length === 0 && pendingPasses.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('abonaments.title')}
      </h2>
      <div className="space-y-2">
        {activePasses.map((pa: any) => {
          const school = pa.schools;
          const hasSessionLimit = pa.sessions_remaining != null;
          const dateLabel = passDateLabel(pa, t);

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
                    {dateLabel ? ` · ${dateLabel}` : null}
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

        {pendingPasses.map((pa: any) => {
          const school = pa.schools;
          const dateLabel = passDateLabel(pa, t);
          return (
            <div
              key={pa.id}
              className="w-full rounded-2xl bg-white p-4 text-left"
              style={{ border: '1px solid hsl(203 20% 90%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {school?.name ?? pa.abonament_types?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pa.abonament_types?.name}
                    {dateLabel ? ` · ${dateLabel}` : null}
                  </p>
                </div>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning shrink-0">
                  {t('abonaments.pendingApproval')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function passDateLabel(pa: any, t: (key: string, options?: Record<string, unknown>) => string) {
  const startDate = pa.activated_at ?? pa.created_at;
  const endDate = pa.expires_at ? new Date(pa.expires_at) : deriveEndDate(pa.activated_at, pa.abonament_types?.duration_days);
  const parts: string[] = [];
  if (startDate) parts.push(t('abonaments.startsOn', { date: format(new Date(startDate), 'd MMM yyyy') }));
  parts.push(endDate ? t('abonaments.expiresOn', { date: format(endDate, 'd MMM yyyy') }) : t('abonaments.noEndDate'));
  return parts.join(' · ');
}

function deriveEndDate(startDate?: string | null, durationDays?: number | null) {
  if (!startDate || !durationDays) return null;
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays);
  end.setHours(23, 59, 59, 999);
  return end;
}
