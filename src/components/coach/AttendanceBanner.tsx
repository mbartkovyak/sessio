import { useState } from 'react';
import { format } from 'date-fns';
import { ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UpcomingSession } from '@/hooks/training/useTodaySessions';
import { SPORT_ICONS } from '@/lib/constants';
import { getDateLocale } from '@/lib/dateFnsLocale';
import AttendanceSheet from './AttendanceSheet';

interface AttendanceBannerProps {
  sessions: UpcomingSession[];
}

export default function AttendanceBanner({ sessions }: AttendanceBannerProps) {
  const { t } = useTranslation('coach');
  const [activeSession, setActiveSession] = useState<UpcomingSession | null>(null);

  if (sessions.length === 0) return null;

  return (
    <>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <h2 className="text-sm font-semibold text-amber-800">{t('home.attendanceBannerTitle')}</h2>
        </div>
        <div className="space-y-2">
          {sessions.map(session => {
            const training = session.trainings;
            const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
            const coachName = training?.coach?.full_name;
            const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });

            return (
              <button
                key={session.id}
                onClick={() => setActiveSession(session)}
                className="flex w-full items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
              >
                <span className="text-base">{sportIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{training?.name}</p>
                  {coachName && <p className="text-xs text-muted-foreground truncate">{t('trainings.coachName', { name: coachName })}</p>}
                  <p className="text-xs text-muted-foreground">{dateLabel} · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
                </div>
                <span className="text-xs font-semibold text-amber-600 shrink-0 text-right max-w-16 leading-tight">{t('home.markAttendance')}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeSession && (
        <AttendanceSheet session={activeSession} onClose={() => setActiveSession(null)} />
      )}
    </>
  );
}
