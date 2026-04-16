import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { SessioLogoCompact } from '@/components/SessioLogo';
import OnboardingProgress from '@/components/shared/OnboardingProgress';
import QuestionnaireWelcome from '@/components/onboarding/QuestionnaireWelcome';
import QuestionnaireGoal from '@/components/onboarding/QuestionnaireGoal';
import QuestionnaireAthleteSports from '@/components/onboarding/QuestionnaireAthleteSports';
import QuestionnairePush from '@/components/onboarding/QuestionnairePush';
import QuestionnaireDemo from '@/components/onboarding/QuestionnaireDemo';
import QuestionnaireFinish from '@/components/onboarding/QuestionnaireFinish';

export type CoachTrack = 'solo' | 'owner' | 'member';
type Audience = 'athlete' | 'coach';

type AthleteStep = 'welcome' | 'sports' | 'push';
type CoachStep = 'goal' | 'demo' | 'push' | 'finish';
type Step = AthleteStep | CoachStep;

// Screen positions within existing onboarding (name → role → details …).
// Used to compute unified progress bar across existing + new questionnaire.
const EXISTING_STEPS_BY_TRACK: Record<CoachTrack | 'athlete', number> = {
  athlete: 3,
  solo: 4,
  owner: 5,
  member: 4,
};


export default function Questionnaire() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [audience, setAudience] = useState<Audience | null>(null);
  const [coachTrack, setCoachTrack] = useState<CoachTrack | null>(null);
  const [step, setStep] = useState<Step>('welcome');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Determine audience + coach track from profile / schools
  useEffect(() => {
    if (!profile) return;
    const role = profile.role;
    if (role === 'player') {
      setAudience('athlete');
      return;
    }
    setAudience('coach');
    if (role === 'coach') {
      setCoachTrack('member');
    } else if (role === 'school_owner' && user) {
      supabase
        .from('schools')
        .select('is_listed')
        .eq('owner_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setCoachTrack(data?.is_listed ? 'owner' : 'solo');
        });
    }
  }, [profile, user]);

  // Redirect if profile says questionnaire already complete (covers back-nav / reload)
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth/sign-in', { replace: true }); return; }
    if (!profile?.onboarding_complete || !profile.role) { navigate('/onboarding', { replace: true }); return; }
    if (profile.questionnaire_complete) {
      navigate(homePathForRole(profile.role), { replace: true });
    }
  }, [loading, user, profile, navigate]);

  const isAthlete = audience === 'athlete';

  // Progress computation
  const existingTotal = audience === 'athlete' ? EXISTING_STEPS_BY_TRACK.athlete : coachTrack ? EXISTING_STEPS_BY_TRACK[coachTrack] : 4;
  const newStepsTotal = isAthlete ? 3 : 4;
  const total = existingTotal + newStepsTotal;
  const newStepIndex = newStepIndexFor(step, isAthlete);
  const current = existingTotal + newStepIndex;

  function goBack() {
    // First step of each track → go back to existing onboarding
    const firstStep = isAthlete ? 'welcome' : 'goal';
    if (step === firstStep) {
      navigate('/onboarding', { state: { fromQuestionnaire: true } });
      return;
    }
    if (isAthlete) {
      if (step === 'sports') setStep('welcome');
      else if (step === 'push') setStep('sports');
    } else {
      if (step === 'demo') setStep('goal');
      else if (step === 'push') setStep('demo');
      else if (step === 'finish') setStep('push');
    }
  }

  async function completeQuestionnaire(route: string) {
    if (!user) return;
    setBusy(true);
    await supabase
      .from('profiles')
      .update({ questionnaire_complete: true })
      .eq('id', user.id);
    await refreshProfile();
    setBusy(false);
    navigate(route, { replace: true });
  }

  async function saveGoal(goal: string) {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ primary_goal: goal })
      .eq('id', user.id);
    setStep('demo');
  }

  async function saveSports(sports: string[]) {
    if (!user) return;
    if (sports.length > 0) {
      await supabase
        .from('profiles')
        .update({ preferred_sports: sports } as never)
        .eq('id', user.id);
    }
    setStep('push');
  }

  async function handlePushDone(enabled: boolean) {
    setNotificationsEnabled(enabled);
    if (isAthlete) {
      await completeQuestionnaire(postQuestionnairePath(profile?.role));
    } else {
      setStep('demo');
    }
  }

  function handleFinish(primary: boolean) {
    if (!coachTrack) return;
    const route = primary
      ? coachTrack === 'member'
        ? '/coach/calendar'
        : '/coach/trainings/new'
      : postQuestionnairePath(profile?.role);
    completeQuestionnaire(route);
  }

  if (!audience || (audience === 'coach' && !coachTrack)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader className="rounded-b-2xl px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3 text-white">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <SessioLogoCompact />
          <div className="flex-1" />
        </div>
        <div className="max-w-md mx-auto mt-3">
          <OnboardingProgress current={current} total={total} />
        </div>
      </PageHeader>

      <div className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {renderStep()}
          {busy && (
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    if (isAthlete) {
      if (step === 'welcome') return <QuestionnaireWelcome audience="athlete" onContinue={() => setStep('sports')} />;
      if (step === 'sports') return <QuestionnaireAthleteSports onContinue={saveSports} />;
      if (step === 'push') return <QuestionnairePush audience="athlete" onDone={handlePushDone} />;
      return null;
    }
    // coach
    if (!coachTrack) return null;
    if (step === 'goal') return <QuestionnaireGoal coachTrack={coachTrack} onContinue={saveGoal} />;
    if (step === 'demo') return <QuestionnaireDemo coachTrack={coachTrack} onContinue={() => setStep('push')} />;
    if (step === 'push') return <QuestionnairePush audience="coach" coachTrack={coachTrack} onDone={handlePushDone} />;
    if (step === 'finish') return (
      <QuestionnaireFinish
        coachTrack={coachTrack}
        firstName={profile?.first_name ?? ''}
        notificationsEnabled={notificationsEnabled}
        onPrimary={() => handleFinish(true)}
        onSecondary={() => handleFinish(false)}
      />
    );
    return null;
  }
}

function newStepIndexFor(step: Step, isAthlete: boolean): number {
  if (isAthlete) {
    return step === 'welcome' ? 1 : step === 'sports' ? 2 : 3;
  }
  const coachOrder: CoachStep[] = ['goal', 'demo', 'push', 'finish'];
  return coachOrder.indexOf(step as CoachStep) + 1;
}

function postQuestionnairePath(role: string | null | undefined): string {
  // Honor pending invite that was preserved by the existing onboarding flow.
  const pendingInvite = sessionStorage.getItem('pending_invite');
  if (pendingInvite) {
    const pendingSession = sessionStorage.getItem('pending_invite_session');
    sessionStorage.removeItem('pending_invite');
    sessionStorage.removeItem('pending_invite_ts');
    sessionStorage.removeItem('pending_invite_session');
    const suffix = pendingSession ? `?session=${pendingSession}` : '';
    return `/join/${pendingInvite}${suffix}`;
  }
  return homePathForRole(role);
}

function homePathForRole(role: string | null | undefined): string {
  if (role === 'player') return '/player';
  return '/coach';
}
