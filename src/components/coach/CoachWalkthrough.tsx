import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';

export default function CoachWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation('coach');

  const STEPS = [
    {
      emoji: '🏆',
      title: t('walkthrough.welcomeTitle'),
      desc: t('walkthrough.welcomeDesc'),
      action: t('walkthrough.letsGo'),
    },
    {
      emoji: '👥',
      title: t('walkthrough.createTitle'),
      desc: t('walkthrough.createDesc'),
      action: t('walkthrough.createButton'),
      route: '/coach/groups/new',
    },
    {
      emoji: '📨',
      title: t('walkthrough.inviteTitle'),
      desc: t('walkthrough.inviteDesc'),
      action: t('walkthrough.gotIt'),
    },
    {
      emoji: '✅',
      title: t('walkthrough.allSetTitle'),
      desc: t('walkthrough.allSetDesc'),
      action: t('walkthrough.startCoaching'),
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const checklist = [
    t('walkthrough.checkGroupCreated'),
    t('walkthrough.checkInviteReady'),
    t('walkthrough.checkAutoConfirm'),
    t('walkthrough.checkWaitlist'),
  ];

  function handleAction() {
    if (current.route) {
      navigate(current.route);
      onClose();
      return;
    }
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm px-4 pb-6 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 card-shadow-md animate-scale-in">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-border'
                }`}
              />
            ))}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center -mr-2 -mt-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 text-center">
          <div className="mb-4 text-5xl">{current.emoji}</div>
          <h2 className="mb-2 text-xl font-bold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
        </div>

        {/* Checklist for last step */}
        {isLast && (
          <div className="mb-5 space-y-2">
            {checklist.map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                {item}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleAction}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-primary-foreground min-h-[56px]"
        >
          {current.action}
          {!isLast && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
