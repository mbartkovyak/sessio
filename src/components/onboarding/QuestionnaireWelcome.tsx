import { useTranslation } from 'react-i18next';
import { Calendar, MessageCircle, CheckCircle2, Wallet } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  audience: 'athlete' | 'coach';
  coachTrack?: CoachTrack;
  onContinue: () => void;
}

export default function QuestionnaireWelcome({ audience, coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');

  const isAthlete = audience === 'athlete';
  const title = isAthlete
    ? t('questionnaire.athlete.welcomeTitle')
    : coachTrack === 'owner'
      ? t('questionnaire.coach.welcomeTitleOwner')
      : coachTrack === 'member'
        ? t('questionnaire.coach.welcomeTitleMember')
        : t('questionnaire.coach.welcomeTitleSolo');

  const subtitle = isAthlete
    ? t('questionnaire.athlete.welcomeSubtitle')
    : coachTrack === 'member'
      ? t('questionnaire.coach.welcomeSubtitleMember')
      : t('questionnaire.coach.welcomeSubtitleOwner');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 text-muted-foreground">{subtitle}</p>

      {/* Stylized preview mockup */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {isAthlete ? <AthletePreview /> : <CoachPreview />}
      </div>

      <button
        onClick={onContinue}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground min-h-[44px]"
      >
        {t('questionnaire.common.getStarted')}
      </button>
    </div>
  );
}

function AthletePreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Tomorrow · 18:00</div>
          <div className="font-semibold text-foreground">Tennis · Court 3</div>
        </div>
        <div className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">Signed up</div>
      </div>
      <div className="h-px bg-border/60" />
      <div className="flex items-center gap-2 text-sm">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Pass balance:</span>
        <span className="font-semibold text-foreground">8 sessions</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">1 new message from your coach</span>
      </div>
    </div>
  );
}

function CoachPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Today · 18:00</div>
          <div className="font-semibold text-foreground">Monday Tennis · Court 3</div>
        </div>
        <div className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">4/4</div>
      </div>
      <div className="h-px bg-border/60" />
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-muted-foreground">All confirmed — no chasing needed</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Next: Tuesday 17:00 · 3/4 signed up</span>
      </div>
    </div>
  );
}
