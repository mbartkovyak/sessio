import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import { useSessionAttendance, useMarkAttendance } from '@/hooks/training/useTrainings';
import type { UpcomingSession } from '@/hooks/training/useTodaySessions';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { SPORT_ICONS } from '@/lib/constants';

interface AttendanceSheetProps {
  session: UpcomingSession;
  onClose: () => void;
}

export default function AttendanceSheet({ session, onClose }: AttendanceSheetProps) {
  const { t } = useTranslation('coach');
  const training = session.trainings;
  const { data: attendance = [], isLoading } = useSessionAttendance(session.id);
  const markAttendance = useMarkAttendance();

  // Local state: userId → present (true) or absent (false)
  const [present, setPresent] = useState<Map<string, boolean>>(new Map());

  // Initialize from fetched data
  useEffect(() => {
    if (attendance.length === 0) return;
    const init = new Map<string, boolean>();
    for (const a of attendance) {
      init.set(a.user_id, a.status === 'confirmed');
    }
    setPresent(init);
  }, [attendance]);

  function toggle(userId: string) {
    setPresent(prev => {
      const next = new Map(prev);
      next.set(userId, !next.get(userId));
      return next;
    });
  }

  function setAll(value: boolean) {
    setPresent(prev => {
      const next = new Map(prev);
      for (const key of next.keys()) next.set(key, value);
      return next;
    });
  }

  function handleSave() {
    const entries = attendance.map(a => ({
      userId: a.user_id,
      present: present.get(a.user_id) ?? false,
      originalStatus: a.status,
    }));
    markAttendance.mutate(
      { sessionId: session.id, entries },
      {
        onSuccess: () => {
          toast.success(t('home.attendanceSaved'));
          onClose();
        },
      },
    );
  }

  const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{sportIcon}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{training?.name}</h3>
              <p className="text-xs text-muted-foreground">
                {dateLabel} · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Quick actions */}
        {attendance.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 shrink-0">
            <button
              onClick={() => setAll(true)}
              className="flex-1 rounded-lg bg-success/10 py-1.5 text-xs font-semibold text-success active:scale-[0.97] transition-transform"
            >
              {t('home.allPresent')}
            </button>
            <button
              onClick={() => setAll(false)}
              className="flex-1 rounded-lg bg-muted py-1.5 text-xs font-semibold text-muted-foreground active:scale-[0.97] transition-transform"
            >
              {t('home.allAbsent')}
            </button>
          </div>
        )}

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="py-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : attendance.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noAttendance')}</p>
          ) : (
            <div className="divide-y divide-border">
              {attendance.map(a => {
                const isPresent = present.get(a.user_id) ?? false;
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.user_id)}
                    className="flex w-full items-center gap-3 py-3 text-left active:bg-muted/50 transition-colors"
                  >
                    <Avatar url={a.profiles?.avatar_url} name={a.profiles?.full_name} size="sm" />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {a.profiles?.full_name ?? t('common:profile.unknown')}
                    </span>
                    {isPresent ? (
                      <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pt-2 pb-6 shrink-0">
          <button
            onClick={handleSave}
            disabled={markAttendance.isPending}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground min-h-[44px] active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            {t('home.saveAttendance')}
          </button>
        </div>
      </div>
    </>
  );
}
