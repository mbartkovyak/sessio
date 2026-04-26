import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { useAvailablePassTypes, useMyAbonaments, useRequestPass } from '@/hooks/training/useAbonaments';

export default function AvailablePassesSection() {
  const { t } = useTranslation('player');
  const { data: types = [] } = useAvailablePassTypes();
  const { data: myAbonaments = [] } = useMyAbonaments();
  const requestPass = useRequestPass();

  // Filter out types the player already has an active or pending pass for
  const existingTypeIds = new Set(
    myAbonaments
      .filter((pa: any) => pa.status === 'active' || pa.status === 'pending')
      .map((pa: any) => pa.abonament_type_id),
  );
  const available = types.filter((t: any) => !existingTypeIds.has(t.id));

  if (available.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('abonaments.availablePasses')}
      </h2>
      <div className="space-y-2">
        {available.map((type: any) => {
          const school = type.schools;
          const details: string[] = [];
          if (type.sessions_count) details.push(`${type.sessions_count}x`);
          if (type.duration_days) details.push(`${type.duration_days}d`);
          if (type.price != null) details.push(`${type.price} ${type.currency}`);

          return (
            <div
              key={type.id}
              className="w-full rounded-2xl bg-white p-4 text-left"
              style={{ border: '1px solid hsl(203 20% 90%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {school?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type.name}{details.length > 0 ? ` · ${details.join(' · ')}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => requestPass.mutate({
                    abonamentTypeId: type.id,
                    schoolId: type.school_id,
                    typeName: type.name,
                  })}
                  disabled={requestPass.isPending}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shrink-0 disabled:opacity-50"
                >
                  {t('abonaments.request')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
