import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { CheckCircle2, Clock, History, Ticket } from 'lucide-react';
import AppHeader from '@/components/shared/AppHeader';
import { SessioLoader } from '@/components/SessioLogo';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/utils';
import {
  daysRemaining,
  isAbonamentActive,
  useAvailablePassTypes,
  useMySchoolAbonaments,
  useRequestPass,
} from '@/hooks/training/useAbonaments';

export default function PlayerPasses() {
  const { t } = useTranslation('player');
  const [startDates, setStartDates] = useState<Record<string, string>>({});
  const [startDateErrors, setStartDateErrors] = useState<Record<string, boolean>>({});
  const [submittingTypeId, setSubmittingTypeId] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isCoachRoute = pathname.includes('/coach/');

  const { data: coach, isLoading: coachLoading } = useQuery({
    queryKey: ['pass-page-coach', id],
    enabled: !!id && isCoachRoute,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, school_id')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as { id: string; full_name: string | null; school_id: string | null };
    },
  });

  // From the coach route the param resolves to a coach UUID via the coach query above;
  // from the school route the param can be either a UUID or a slug.
  const schoolLookup = isCoachRoute ? coach?.school_id : id;

  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['pass-page-school', schoolLookup],
    enabled: !!schoolLookup,
    queryFn: async () => {
      const column = isUuid(schoolLookup) ? 'id' : 'slug';
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq(column, schoolLookup!)
        .single();
      if (error) throw error;
      return data as { id: string; name: string | null };
    },
  });

  // Always pass the resolved UUID to downstream hooks — they query by school_id (UUID FK).
  const schoolUuid = school?.id;
  const { data: passes = [], isLoading: passesLoading } = useMySchoolAbonaments(schoolUuid);
  const { data: passTypes = [], isLoading: typesLoading } = useAvailablePassTypes(schoolUuid ? [schoolUuid] : []);
  const requestPass = useRequestPass();

  const pendingTypeIds = new Set(
    passes
      .filter((pass: any) => pass.status === 'pending')
      .map((pass: any) => pass.abonament_type_id),
  );
  const availableTypes = passTypes;
  const activePasses = passes.filter((pass: any) => isAbonamentActive(pass));
  const requestedPasses = passes.filter((pass: any) => pass.status === 'pending');
  const pastPasses = passes.filter((pass: any) => pass.status !== 'pending' && !isAbonamentActive(pass));
  const isLoading = coachLoading || schoolLoading || passesLoading || typesLoading;
  const title = isCoachRoute ? (coach?.full_name ?? t('coachProfile.title')) : (school?.name ?? t('schoolProfile.title'));

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
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={t('actions.passes')} subtitle={title} back />

      <main className="flex-1 pb-10">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <SessioLoader />
          </div>
        ) : !schoolUuid ? (
          <div className="max-w-md mx-auto px-4 py-6">
            <EmptyState text={t('abonaments.noPassesHere')} />
          </div>
        ) : (
          <div className="max-w-md mx-auto px-4 py-6 space-y-6">
            <PassSection title={t('abonaments.activePasses')} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
              {activePasses.length > 0 ? activePasses.map((pass: any) => <PlayerPassCard key={pass.id} pass={pass} />) : <EmptyState text={t('abonaments.noActivePasses')} />}
            </PassSection>

            <PassSection title={t('abonaments.requestedPasses')} icon={<Clock className="h-4 w-4 text-warning" />}>
              {requestedPasses.length > 0 ? requestedPasses.map((pass: any) => <PlayerPassCard key={pass.id} pass={pass} />) : <EmptyState text={t('abonaments.noRequestedPasses')} />}
            </PassSection>

            <PassSection title={t('abonaments.availableToRequest')} icon={<Ticket className="h-4 w-4 text-primary" />}>
              {availableTypes.length > 0 ? availableTypes.map((type: any) => (
                <AvailablePassCard
                  key={type.id}
                  type={type}
                  isPending={submittingTypeId === type.id || pendingTypeIds.has(type.id)}
                  isAlreadyRequested={pendingTypeIds.has(type.id)}
                  startDate={startDates[type.id] ?? ''}
                  hasStartDateError={!!startDateErrors[type.id]}
                  onStartDateChange={(value) => handleStartDateChange(type.id, value)}
                  onRequest={() => handleRequest(type)}
                />
              )) : <EmptyState text={t('abonaments.noAvailablePasses')} />}
            </PassSection>

            <PassSection title={t('abonaments.pastPasses')} icon={<History className="h-4 w-4 text-muted-foreground" />}>
              {pastPasses.length > 0 ? pastPasses.map((pass: any) => <PlayerPassCard key={pass.id} pass={pass} />) : <EmptyState text={t('abonaments.noPastPasses')} />}
            </PassSection>
          </div>
        )}
      </main>
    </div>
  );
}

function PassSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PlayerPassCard({ pass }: { pass: any }) {
  const { t } = useTranslation('player');
  const type = pass.abonament_types;
  const sessionsTotal = pass.sessions_total ?? type?.sessions_count ?? null;
  const sessionsRemaining = pass.sessions_remaining ?? (pass.status === 'pending' ? sessionsTotal : null);
  const hasSessionLimit = sessionsTotal != null;
  const active = isAbonamentActive(pass);
  const notStarted = active && pass.activated_at && new Date(pass.activated_at) > new Date();
  const daysLeft = active && !notStarted && pass.expires_at ? daysRemaining(pass.expires_at) : null;
  const startDate = pass.activated_at ? new Date(pass.activated_at) : null;
  const endDate = pass.expires_at ? new Date(pass.expires_at) : deriveEndDate(pass.activated_at, type?.duration_days);
  const dateLabels: string[] = [];
  if (startDate) dateLabels.push(t('abonaments.startsOn', { date: format(startDate, 'd MMM yyyy') }));
  dateLabels.push(endDate ? t('abonaments.expiresOn', { date: format(endDate, 'd MMM yyyy') }) : t('abonaments.noEndDate'));
  const status = pass.status === 'pending'
    ? t('abonaments.pendingApproval')
    : active
      ? t('calendar.confirmed')
      : pass.status === 'used_up'
        ? t('abonaments.usedUp')
        : t('abonaments.expired');

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${active ? 'bg-success/10' : pass.status === 'pending' ? 'bg-warning/10' : 'bg-muted'}`}>
          <Ticket className={`h-5 w-5 ${active ? 'text-success' : pass.status === 'pending' ? 'text-warning' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{pass.abonament_types?.name}</p>
          <p className="text-xs text-muted-foreground">
            {dateLabels.length > 0
              ? dateLabels.join(' · ')
              : notStarted
                ? t('abonaments.startsOn', { date: format(new Date(pass.activated_at), 'd MMM') })
                : daysLeft != null
                  ? `${daysLeft}d`
                  : status}
          </p>
        </div>
        {hasSessionLimit ? (
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold leading-tight text-foreground">{sessionsRemaining ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">/ {sessionsTotal}</p>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            {t('abonaments.unlimited')}
          </span>
        )}
      </div>
    </div>
  );
}

function AvailablePassCard({
  type,
  isPending,
  isAlreadyRequested,
  startDate,
  hasStartDateError,
  onStartDateChange,
  onRequest,
}: {
  type: any;
  isPending: boolean;
  isAlreadyRequested: boolean;
  startDate: string;
  hasStartDateError: boolean;
  onStartDateChange: (value: string) => void;
  onRequest: () => void;
}) {
  const { t } = useTranslation('player');
  const details: string[] = [];
  if (type.sessions_count) details.push(`${type.sessions_count}x`);
  if (type.duration_days) details.push(`${type.duration_days}d`);
  if (type.price != null) details.push(`${type.price} ${type.currency}`);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Ticket className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{type.name}</p>
          {details.length > 0 && <p className="text-xs text-muted-foreground">{details.join(' · ')}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{t('abonaments.requestStartDate')}</span>
          <input
            type="date"
            value={startDate}
            disabled={isAlreadyRequested}
            onChange={(event) => onStartDateChange(event.target.value)}
            aria-invalid={hasStartDateError}
            className={`h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground disabled:opacity-50 ${hasStartDateError ? 'border-destructive' : 'border-border'}`}
          />
        </label>
        <button
          onClick={onRequest}
          disabled={isPending}
          className="h-9 shrink-0 rounded-full bg-success px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isAlreadyRequested ? t('abonaments.pendingApproval') : t('abonaments.request')}
        </button>
      </div>
      {hasStartDateError && (
        <p className="mt-1 text-xs font-medium text-destructive">{t('abonaments.chooseStartDate')}</p>
      )}
    </div>
  );
}

function deriveEndDate(startDate?: string | null, durationDays?: number | null) {
  if (!startDate || !durationDays) return null;
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays);
  end.setHours(23, 59, 59, 999);
  return end;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
