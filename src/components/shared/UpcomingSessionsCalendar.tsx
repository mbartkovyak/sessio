import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { SPORT_ICONS } from '@/lib/constants';
import CalendarGrid from '@/components/shared/CalendarGrid';
import Avatar from '@/components/shared/Avatar';
import SignUpSheet from '@/components/shared/SignUpSheet';
import type { PublicUpcomingSession } from '@/hooks/school/useSchools';

interface Props {
  sessions: PublicUpcomingSession[];
  isLoading: boolean;
  showCoach?: boolean;
  emptyState: ReactNode;
}

export default function UpcomingSessionsCalendar({ sessions, isLoading, showCoach = false, emptyState }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [signUpFor, setSignUpFor] = useState<PublicUpcomingSession | null>(null);

  function openDetails(s: PublicUpcomingSession) {
    // Card body opens the existing JoinTraining page in default mode — that's the
    // training-details surface (sport, schedule, capacity, coach card, sign-up CTAs).
    navigate(`/join/${s.invite_code}`);
  }

  return (
    <>
      <CalendarGrid<PublicUpcomingSession>
        items={sessions}
        getDate={(s) => s.session_date}
        isLoading={isLoading}
        emptyState={emptyState}
        renderItem={(s) => (
          <div
            key={s.session_id}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card pl-4 pr-2 py-2 shadow-sm"
          >
            <button
              type="button"
              onClick={() => openDetails(s)}
              className="flex flex-1 min-w-0 items-center gap-3 py-1.5 text-left active:opacity-70 transition-opacity"
            >
              <span className="text-xl shrink-0">{SPORT_ICONS[s.sport] ?? '🎯'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{s.training_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                </p>
                {showCoach && s.coach_name && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Avatar url={s.coach_avatar_url} name={s.coach_name} size="xs" />
                    <span className="text-xs font-medium text-primary truncate">{s.coach_name}</span>
                  </div>
                )}
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSignUpFor(s);
              }}
              className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground min-h-[36px] active:opacity-80 transition-opacity"
            >
              {t('join.signUp')}
            </button>
          </div>
        )}
      />

      {signUpFor && (
        <SignUpSheet session={signUpFor} onClose={() => setSignUpFor(null)} />
      )}
    </>
  );
}
