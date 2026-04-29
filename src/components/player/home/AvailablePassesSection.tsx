import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { useAvailablePassTypes, useMyAbonaments, useRequestPass } from '@/hooks/training/useAbonaments';

export default function AvailablePassesSection({ schoolIds }: { schoolIds?: Array<string | null | undefined> }) {
  const { t } = useTranslation('player');
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [startDateErrors, setStartDateErrors] = useState<Record<string, boolean>>({});
  const [submittingTypeId, setSubmittingTypeId] = useState<string | null>(null);
  const { data: types = [] } = useAvailablePassTypes(schoolIds);
  const { data: myAbonaments = [] } = useMyAbonaments();
  const requestPass = useRequestPass();

  // Keep active passes requestable so athletes can renew or buy another pack.
  // Only hide a type while the same request is already waiting for approval.
  const pendingTypeIds = new Set(
    myAbonaments
      .filter((pa: any) => pa.status === 'pending')
      .map((pa: any) => pa.abonament_type_id),
  );
  const available = types.filter((t: any) => !pendingTypeIds.has(t.id));

  if (available.length === 0) return null;

  function handleStartDateChange(typeId: string, value: string) {
    setStartDates((dates) => ({ ...dates, [typeId]: value }));
    setStartDateErrors((errors) => ({ ...errors, [typeId]: false }));
  }

  function handleRequest(type: any) {
    const startDate = startDates[type.id];
    if (!startDate) {
      setStartDateErrors((errors) => ({ ...errors, [type.id]: true }));
      return;
    }

    setSubmittingTypeId(type.id);
    requestPass.mutate(
      {
        abonamentTypeId: type.id,
        schoolId: type.school_id,
        typeName: type.name,
        startDate,
      },
      {
        onSettled: () => setSubmittingTypeId(null),
      },
    );
  }

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
              </div>
              <div className="mt-3 flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t('abonaments.requestStartDate')}
                  </span>
                  <input
                    type="date"
                    value={startDates[type.id] ?? ''}
                    onChange={(event) => handleStartDateChange(type.id, event.target.value)}
                    aria-invalid={!!startDateErrors[type.id]}
                    className={`h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground ${startDateErrors[type.id] ? 'border-destructive' : 'border-border'}`}
                  />
                </label>
                <button
                  onClick={() => handleRequest(type)}
                  disabled={submittingTypeId === type.id}
                  className="h-9 rounded-full bg-success px-4 text-xs font-semibold text-white shrink-0 disabled:opacity-50"
                >
                  {t('abonaments.request')}
                </button>
              </div>
              {startDateErrors[type.id] && (
                <p className="mt-1 text-xs font-medium text-destructive">{t('abonaments.chooseStartDate')}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
