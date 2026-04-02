import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  trainings: { id: string }[];
}

export default function CoachSetupGuide({ trainings }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');

  const hasTraining = trainings.length > 0;
  const venues = ((profile as any)?.venues ?? []) as any[];
  const hasProfile = !!(profile?.bio?.trim()) && venues.length > 0;

  // Hide when all steps are complete
  if (hasTraining && hasProfile) return null;

  const steps = [
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
      action: () => navigate('/coach/profile'),
      disabled: false,
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t('setupGuide.title')}</h2>
        <span className="text-xs text-muted-foreground">
          {t('setupGuide.progress', { done: doneCount, total: steps.length })}
        </span>
      </div>

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
    </div>
  );
}
