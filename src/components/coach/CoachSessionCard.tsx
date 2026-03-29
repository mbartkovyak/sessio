import { useNavigate } from 'react-router-dom';
import { CalendarDays, X, MapPin, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SPORT_ICONS } from '@/lib/constants';

interface CoachSessionCardProps {
  session: any;
  attendance?: { confirmed: number; total: number };
  /** Show cancel/reschedule action buttons (default true) */
  showActions?: boolean;
  /** Coach name to display (school owner view) */
  coachName?: string;
  onCancel?: (session: any) => void;
  onReschedule?: (session: any) => void;
}

export default function CoachSessionCard({
  session,
  attendance,
  showActions = true,
  coachName,
  onCancel,
  onReschedule,
}: CoachSessionCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const training = session.trainings;
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
  const isCancelled = session.status === 'cancelled';

  return (
    <div className={`rounded-xl border border-border ${isCancelled ? 'bg-destructive/10 border-destructive/20' : 'bg-card'} shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => navigate(`/coach/trainings/${training?.id}`)}
          className="flex flex-1 items-center gap-3 text-left min-w-0"
        >
          <span className="text-xl shrink-0">{sportIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-semibold text-sm truncate ${isCancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{training?.name}</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">{t(`common:trainingType.${training?.type}`)}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
              {coachName && ` · ${coachName}`}
              {!isCancelled && attendance && attendance.total > 0 && (
                <span className="inline-flex items-center gap-0.5 text-success font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('detail.attendanceSummary', { confirmed: attendance.confirmed, total: attendance.total })}
                </span>
              )}
            </span>
          </div>
        </button>
        {isCancelled ? (
          <span className="text-xs font-medium text-destructive shrink-0">{t('calendar.cancelled')}</span>
        ) : showActions && onCancel && onReschedule ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onReschedule(session)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title={t('common:actions.reschedule')}>
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
            </button>
            <button onClick={() => onCancel(session)} className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors" title={t('common:actions.cancelSession')}>
              <X className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex border-t border-border divide-x divide-border">
        {training?.venue && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <MapPin className="h-3 w-3" /> {t('home.navigateTo', { venue: training.venue.split(',')[0] })}
          </a>
        )}
        {training?.id && (
          <button
            onClick={() => navigate(`/coach/messages/${training.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <MessageCircle className="h-3 w-3" /> {t('common:chat.group')}
          </button>
        )}
      </div>
    </div>
  );
}
