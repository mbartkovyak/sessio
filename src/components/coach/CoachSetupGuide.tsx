import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

const DISMISSED_KEY = 'sessio_setup_guide_dismissed';
const CALENDAR_SEEN_KEY = 'sessio_setup_calendar_seen';
const COACHES_SEEN_KEY = 'sessio_setup_coaches_seen';

interface Props {
  trainings: { id: string }[];
  schoolCoachCount?: number;
  schoolBio?: string;
}

export default function CoachSetupGuide({ trainings, schoolCoachCount, schoolBio }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  const hasTraining = trainings.length > 0;
  const isSchoolOwner = schoolCoachCount !== undefined;
  const hasProfile = isSchoolOwner ? !!(schoolBio?.trim()) : !!(profile?.bio?.trim());
  const calendarSeen = localStorage.getItem(CALENDAR_SEEN_KEY) === '1';
  const hasCoaches = (schoolCoachCount ?? 0) > 1; // >1 because owner counts as one

  const coachesSeen = localStorage.getItem(COACHES_SEEN_KEY) === '1';
  const allDone = hasTraining && hasProfile && calendarSeen && (!isSchoolOwner || coachesSeen);

  // Hidden once dismissed
  if (dismissed) return null;

  const steps = [
    // School owners: invite coaches first (before creating trainings)
    ...(isSchoolOwner ? [{
      done: coachesSeen || hasCoaches,
      label: t('setupGuide.inviteCoaches'),
      desc: t('setupGuide.inviteCoachesDesc'),
      action: () => { localStorage.setItem(COACHES_SEEN_KEY, '1'); navigate('/coach/coaches'); },
      disabled: false,
    }] : []),
    {
      done: hasTraining,
      label: t('setupGuide.createTraining'),
      desc: t('setupGuide.createTrainingDesc'),
      action: () => navigate('/coach/trainings/new'),
      disabled: false,
    },
    {
      done: hasTraining,
      label: t('setupGuide.inviteAthletes'),
      desc: t('setupGuide.inviteAthletesDesc'),
      action: () => hasTraining && navigate(`/coach/trainings/${trainings[0].id}`),
      disabled: !hasTraining,
    },
    {
      done: hasProfile,
      label: t('setupGuide.completeProfile'),
      desc: t('setupGuide.completeProfileDesc'),
      action: () => navigate(isSchoolOwner ? '/school/profile' : '/coach/profile'),
      disabled: false,
    },
    {
      done: localStorage.getItem(CALENDAR_SEEN_KEY) === '1',
      label: t('setupGuide.checkCalendar'),
      desc: t('setupGuide.checkCalendarDesc'),
      action: () => { localStorage.setItem(CALENDAR_SEEN_KEY, '1'); navigate('/coach/calendar'); },
      disabled: !hasTraining,
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t('setupGuide.title')}</h2>
        <div className="flex items-center gap-2">
          {!allDone && (
            <span className="text-xs text-muted-foreground">
              {t('setupGuide.progress', { done: doneCount, total: steps.length })}
            </span>
          )}
          <button onClick={handleDismiss} className="flex items-center justify-center h-6 w-6 -mr-1 rounded-full text-muted-foreground active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allDone ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <p className="text-sm font-medium text-success">{t('setupGuide.allSet')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={step.action}
              disabled={step.disabled}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                step.disabled ? 'opacity-40' : ''
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30 text-[11px] font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              {!step.done && !step.disabled && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
