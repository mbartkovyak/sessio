import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, XCircle, CalendarPlus, ClipboardCheck, RefreshCw } from 'lucide-react';
import type { CoachTrack } from '@/pages/onboarding/Questionnaire';

interface Props {
  coachTrack: CoachTrack;
  onContinue: () => void;
}

type Tab = 'schedule' | 'attendance' | 'backfill';
const TABS: Tab[] = ['schedule', 'attendance', 'backfill'];

const TAB_META: Record<Tab, { icon: typeof CalendarPlus; labelKey: string }> = {
  schedule: { icon: CalendarPlus, labelKey: 'questionnaire.coach.demoTabSchedule' },
  attendance: { icon: ClipboardCheck, labelKey: 'questionnaire.coach.demoTabAttendance' },
  backfill: { icon: RefreshCw, labelKey: 'questionnaire.coach.demoTabBackfill' },
};

export default function QuestionnaireDemo({ coachTrack: _coachTrack, onContinue }: Props) {
  const { t } = useTranslation('auth');
  const [activeTab, setActiveTab] = useState<Tab>('schedule');

  const isLastTab = activeTab === TABS[TABS.length - 1];

  function handleContinue() {
    if (isLastTab) {
      onContinue();
    } else {
      const idx = TABS.indexOf(activeTab);
      setActiveTab(TABS[idx + 1]);
    }
  }

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold text-foreground leading-tight">{t('questionnaire.coach.demoSetupTitle')}</h1>
      <p className="mb-5 text-base text-muted-foreground leading-snug">{t('questionnaire.coach.demoSetupBody')}</p>

      {/* Tab selector */}
      <div className="flex gap-1.5 mb-4">
        {TABS.map((tab, i) => {
          const meta = TAB_META[tab];
          const Icon = meta.icon;
          const active = activeTab === tab;
          const visited = TABS.indexOf(activeTab) >= i;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-center transition-all duration-300 ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : visited ? 'bg-primary/15 text-primary' : 'bg-secondary/80 text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold leading-tight">{t(meta.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Demo content */}
      <div className="mb-5">
        {activeTab === 'schedule' && <ScheduleDemo />}
        {activeTab === 'attendance' && <AttendanceDemo />}
        {activeTab === 'backfill' && <BackfillDemo />}
      </div>

      {/* Stat — only on last tab */}
      {isLastTab && (
        <div className="mb-5 rounded-xl bg-primary/10 p-4 text-center">
          <p className="text-base font-bold text-primary leading-snug">{t('questionnaire.coach.demoOutputStat')}</p>
        </div>
      )}

      <button
        onClick={handleContinue}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground min-h-[48px]"
      >
        {isLastTab ? t('questionnaire.common.continue') : t('questionnaire.common.next')}
      </button>
    </div>
  );
}

// ─── Tab 1: Auto Schedule ────────────────────────────────────────────────────
// Create a recurring training → 4 sessions appear one by one.
function ScheduleDemo() {
  const { t } = useTranslation('auth');
  const [visibleWeeks, setVisibleWeeks] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setVisibleWeeks(0);
      timers.push(setTimeout(() => setVisibleWeeks(1), 600));
      timers.push(setTimeout(() => setVisibleWeeks(2), 1000));
      timers.push(setTimeout(() => setVisibleWeeks(3), 1400));
      timers.push(setTimeout(() => setVisibleWeeks(4), 1800));
      timers.push(setTimeout(cycle, 5000));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const weeks = ['Mon, 21 Apr', 'Mon, 28 Apr', 'Mon, 5 May', 'Mon, 12 May'];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎾</span>
        <div>
          <div className="text-base font-semibold text-foreground">Monday Tennis</div>
          <div className="text-xs text-muted-foreground">18:00 – 19:30 · Weekly</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {weeks.map((week, i) => (
          <div
            key={week}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-400 ${
              i < visibleWeeks
                ? 'border-success/30 bg-success/5 opacity-100 translate-x-0'
                : 'border-transparent bg-transparent opacity-0 -translate-x-2'
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 shrink-0 transition-all duration-300 ${
              i < visibleWeeks ? 'text-success' : 'text-transparent'
            }`} />
            <span className="text-sm font-medium text-foreground">{week} · 18:00</span>
          </div>
        ))}
      </div>
      <p className={`mt-3 text-center text-sm font-medium text-success transition-opacity duration-500 ${
        visibleWeeks >= 4 ? 'opacity-100' : 'opacity-0'
      }`}>
        {t('questionnaire.coach.demoCaptionSchedule')}
      </p>
    </div>
  );
}

// ─── Tab 2: Attendance ───────────────────────────────────────────────────────
// "Mark all present" button auto-taps → all athletes flip to green.
const ATT_ATHLETES = [
  { name: 'Anna Kowalska', initials: 'AK' },
  { name: 'Marek Nowak', initials: 'MN' },
  { name: 'Kasia Wiśniewska', initials: 'KW' },
] as const;

function AttendanceDemo() {
  const { t } = useTranslation('auth');
  const [stage, setStage] = useState<'idle' | 'tapping' | 'done'>('idle');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('idle');
      timers.push(setTimeout(() => setStage('tapping'), 1200));
      timers.push(setTimeout(() => setStage('done'), 1500));
      timers.push(setTimeout(cycle, 4500));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const allPresent = stage === 'done';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎾</span>
        <div>
          <div className="text-base font-semibold text-foreground">Monday Tennis</div>
          <div className="text-xs text-muted-foreground">Today · 18:00 – 19:30</div>
        </div>
      </div>

      <div
        className={`mb-2 flex items-center justify-center rounded-lg bg-success/10 py-2 text-xs font-semibold text-success transition-all duration-200 ${
          stage === 'tapping' ? 'scale-[0.97] bg-success/25' : ''
        } ${allPresent ? 'opacity-50' : ''}`}
      >
        {t('questionnaire.coach.demoAttendanceBtn')}
      </div>

      <div className="divide-y divide-border">
        {ATT_ATHLETES.map((a, i) => (
          <div key={a.name} className="flex items-center gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
              {a.initials}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground truncate">{a.name}</span>
            <div className="relative h-5 w-5 shrink-0">
              <XCircle
                className={`absolute inset-0 h-5 w-5 text-muted-foreground/40 transition-opacity duration-300 ${
                  allPresent ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              />
              <CheckCircle2
                className={`absolute inset-0 h-5 w-5 text-success transition-all duration-300 ${
                  allPresent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className={`mt-3 text-center text-sm font-medium text-success transition-opacity duration-500 ${
        allPresent ? 'opacity-100' : 'opacity-0'
      }`}>
        {t('questionnaire.coach.demoCaptionAttendance')}
      </p>
    </div>
  );
}

// ─── Tab 3: Waitlist Backfill ────────────────────────────────────────────────
// 3/3 full → Marek cancels (2/3) → Tomek fills from waitlist (3/3).
function BackfillDemo() {
  const { t } = useTranslation('auth');
  const [stage, setStage] = useState<'full' | 'cancelled' | 'backfilled'>('full');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setStage('full');
      timers.push(setTimeout(() => setStage('cancelled'), 1600));
      timers.push(setTimeout(() => setStage('backfilled'), 3600));
      timers.push(setTimeout(cycle, 5600));
    };
    cycle();
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const spots = stage === 'cancelled' ? 2 : 3;
  const isFull = stage !== 'cancelled';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎾</span>
          <div>
            <div className="text-base font-semibold text-foreground">Monday Tennis</div>
            <div className="text-xs text-muted-foreground">Today · 18:00 – 19:30</div>
          </div>
        </div>
        <div className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-all duration-400 ${
          isFull ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        }`}>
          {spots}/3
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Anna — always confirmed */}
        <div className="flex items-center gap-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">AK</div>
          <span className="flex-1 text-sm font-medium text-foreground">Anna Kowalska</span>
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        </div>

        {/* Marek — cancels */}
        <div className="flex items-center gap-3 py-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
            stage === 'cancelled' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-foreground'
          }`}>MN</div>
          <span className={`flex-1 text-sm font-medium transition-all duration-500 ${
            stage === 'cancelled' ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}>Marek Nowak</span>
          <div className="relative h-5 w-5 shrink-0">
            <CheckCircle2 className={`absolute inset-0 h-5 w-5 text-success transition-all duration-400 ${
              stage === 'cancelled' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
            }`} />
            <XCircle className={`absolute inset-0 h-5 w-5 text-destructive transition-all duration-400 ${
              stage === 'cancelled' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`} />
          </div>
        </div>

        {/* Kasia — always confirmed, OR Tomek replaces slot on backfill */}
        <div className="flex items-center gap-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">KW</div>
          <span className="flex-1 text-sm font-medium text-foreground">Kasia Wiśniewska</span>
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        </div>

        {/* Tomek — slides in on backfill */}
        <div className={`flex items-center gap-3 transition-all duration-500 overflow-hidden ${
          stage === 'backfilled' ? 'py-2.5 opacity-100 max-h-20' : 'py-0 opacity-0 max-h-0'
        }`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">TL</div>
          <span className="flex-1 text-sm font-semibold text-success">Tomek Lis</span>
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        </div>
      </div>

      {/* Fixed-height caption */}
      <div className="mt-3 h-5 relative text-center">
        <p className={`absolute inset-x-0 text-sm font-medium transition-opacity duration-400 ${
          stage === 'full' ? 'opacity-100 text-success' : 'opacity-0'
        }`}>{t('questionnaire.coach.demoCaptionFull')}</p>
        <p className={`absolute inset-x-0 text-sm font-medium transition-opacity duration-400 ${
          stage === 'cancelled' ? 'opacity-100 text-destructive' : 'opacity-0'
        }`}>{t('questionnaire.coach.demoCaptionCancel')}</p>
        <p className={`absolute inset-x-0 text-sm font-medium transition-opacity duration-400 ${
          stage === 'backfilled' ? 'opacity-100 text-success' : 'opacity-0'
        }`}>{t('questionnaire.coach.demoCaptionBackfill')}</p>
      </div>
    </div>
  );
}
