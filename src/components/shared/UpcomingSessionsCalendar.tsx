import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { SPORT_ICONS } from '@/lib/constants';
import CalendarGrid from '@/components/shared/CalendarGrid';
import Avatar from '@/components/shared/Avatar';
import type { PublicUpcomingSession } from '@/hooks/school/useSchools';

interface Props {
  sessions: PublicUpcomingSession[];
  isLoading: boolean;
  showCoach?: boolean;
  emptyState: ReactNode;
}

export default function UpcomingSessionsCalendar({ sessions, isLoading, showCoach = false, emptyState }: Props) {
  const navigate = useNavigate();

  function handleSessionClick(s: PublicUpcomingSession) {
    // Recurring trainings with no drop-in have only the recurring sign-up path,
    // so route to /join/{code} (no session param) — that screen surfaces the
    // single "Sign up for all sessions" CTA. Everything else routes to the
    // session-specific deep link.
    const recurringOnly = s.is_recurring === true && s.drop_in_policy === 'none';
    navigate(recurringOnly ? `/join/${s.invite_code}` : `/join/${s.invite_code}?session=${s.session_id}`);
  }

  return (
    <CalendarGrid<PublicUpcomingSession>
      items={sessions}
      getDate={(s) => s.session_date}
      isLoading={isLoading}
      emptyState={emptyState}
      renderItem={(s) => (
        <button
          key={s.session_id}
          onClick={() => handleSessionClick(s)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-all active:scale-[0.98] active:bg-muted/40"
        >
          <span className="text-xl shrink-0">{SPORT_ICONS[s.sport] ?? '🎯'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{s.training_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
            </p>
            {showCoach && s.coach_name && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Avatar url={s.coach_avatar_url} name={s.coach_name} size="xs" />
                <span className="text-xs font-medium text-primary truncate">{s.coach_name}</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      )}
    />
  );
}
