import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { DAYS_FULL, DAYS_SHORT, dayShortLabel } from '@/lib/constants';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';
import { VenueAddForm, type Venue } from '@/components/shared/VenueManager';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import { useTranslation } from 'react-i18next';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));


function TimeSelect({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [h, m] = (value || '09:00').split(':');
  const sel = 'appearance-none text-sm font-semibold text-foreground text-center focus:outline-none w-9';
  return (
    <div data-transparent className={compact
      ? 'inline-flex items-center justify-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1.5 min-h-[38px] w-full'
      : 'inline-flex items-center justify-center rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 min-h-[44px] w-full'
    }>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} className={sel}>
        {HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-sm font-bold text-muted-foreground/60">:</span>
      <select value={m} onChange={e => onChange(`${h}:${e.target.value}`)} className={sel}>
        {MINUTES.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
    </div>
  );
}

export type DaySchedule = { start_time: string; end_time: string };
export type DaySchedules = Record<string, DaySchedule>;

export interface TrainingFormValues {
  name: string;
  type: string;
  sport: string;
  venue: string;
  start_time: string;
  end_time: string;
  max_players: number;
  is_recurring: boolean;
  days_of_week: number[];
  start_date: string;
  end_date: string;
  one_off_date: string;
  booking_mode: string;
  visibility: string;
  confirmation_window_hours: number | null;
  day_schedules: DaySchedules | null;
}

const defaults: TrainingFormValues = {
  name: '', type: 'group', sport: 'Tennis', venue: '',
  start_time: '09:00', end_time: '10:00', max_players: 6,
  is_recurring: true, days_of_week: [],
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  one_off_date: '',
  confirmation_window_hours: 24,
  booking_mode: 'instant', visibility: 'private',
  day_schedules: null,
};

export type VenueOption = Venue;

interface Props {
  mode: 'create' | 'edit';
  initialValues?: Partial<TrainingFormValues>;
  onSubmit: (values: TrainingFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onDelete?: () => void;
  /** School-related: render below visibility */
  schoolSlot?: React.ReactNode;
  /** School venues for dropdown selection */
  venueOptions?: VenueOption[];
  /** Called when user creates a new venue inline (saves to school) */
  onNewVenue?: (venue: VenueOption) => void;
  /** Extra validation errors from parent (e.g. "Select a coach") */
  extraErrors?: string[];
  /** Called when submit is attempted (even if invalid) — lets parent show its own errors */
  onAttemptSubmit?: () => void;
}

export default function TrainingForm({ mode, initialValues, onSubmit, submitting, submitLabel, onCancel, onDelete, schoolSlot, venueOptions, onNewVenue, extraErrors, onAttemptSubmit }: Props) {
  const { t } = useTranslation('coach');
  // Persist create-mode form to localStorage so it survives app-switch.
  // Save synchronously on every change (useEffect might not fire before page kill).
  const DRAFT_KEY = '_trainingFormDraft';
  const DRAFT_TTL = 60 * 60 * 1000; // 1 hour

  function loadDraft(): TrainingFormValues | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > DRAFT_TTL) { localStorage.removeItem(DRAFT_KEY); return null; }
      return { ...defaults, ...parsed.form };
    } catch { return null; }
  }

  function saveDraft(f: TrainingFormValues) {
    if (mode === 'create') {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: f, ts: Date.now() })); } catch {}
    }
  }

  const restoredDraft = mode === 'create' ? loadDraft() : null;
  const [draftRestored] = useState(() => !!restoredDraft);

  const [form, setFormRaw] = useState<TrainingFormValues>(restoredDraft ?? { ...defaults, ...initialValues });
  // Wrap setForm to save synchronously on every change
  const setForm = (updater: TrainingFormValues | ((prev: TrainingFormValues) => TrainingFormValues)) => {
    setFormRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveDraft(next);
      return next;
    });
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingNewVenue, setAddingNewVenue] = useState(false);
  const [sameTime, setSameTime] = useState(() => restoredDraft ? !restoredDraft.day_schedules : !initialValues?.day_schedules);

  // Also save when page goes to background (iOS fires this before killing)
  useEffect(() => {
    if (mode !== 'create') return;
    const save = () => saveDraft(form);
    document.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);
    return () => { document.removeEventListener('visibilitychange', save); window.removeEventListener('pagehide', save); };
  }, [form, mode]);

  useEffect(() => {
    if (initialValues) {
      setForm(f => ({ ...defaults, ...initialValues }));
      setSameTime(!initialValues.day_schedules);
    }
  }, [initialValues?.name]); // re-sync when training data loads

  // Auto-fill venue if school has exactly one venue
  useEffect(() => {
    if (venueOptions?.length === 1 && !form.venue) {
      const v = venueOptions[0];
      set('venue', `${v.name}, ${v.address}`);
    }
  }, [venueOptions]);

  // Track whether form has been modified from its initial state
  const baseline = useMemo(() => restoredDraft ?? { ...defaults, ...initialValues }, []);
  const isDirty = form.name !== baseline.name
    || form.venue !== baseline.venue
    || form.type !== baseline.type
    || form.sport !== baseline.sport
    || form.start_time !== baseline.start_time
    || form.end_time !== baseline.end_time
    || form.max_players !== baseline.max_players
    || form.is_recurring !== baseline.is_recurring
    || form.booking_mode !== baseline.booking_mode
    || form.visibility !== baseline.visibility
    || form.one_off_date !== baseline.one_off_date
    || JSON.stringify(form.days_of_week) !== JSON.stringify(baseline.days_of_week);
  const [submitted, setSubmitted] = useState(false);
  const blocker = useUnsavedChanges(isDirty && !submitted);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => setTouched(prev => new Set(prev).add(field));

  const set = (k: keyof TrainingFormValues, v: any) => setForm(f => ({ ...f, [k]: v }));

  function toggleDay(day: number) {
    setForm(f => {
      const newDays = f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort();
      // Clean up day_schedules for removed days
      let ds = f.day_schedules ? { ...f.day_schedules } : null;
      if (ds) {
        for (const key of Object.keys(ds)) {
          if (!newDays.includes(Number(key))) delete ds[key];
        }
      }
      return { ...f, days_of_week: newDays, day_schedules: ds };
    });
  }

  function setDayTime(day: number, field: 'start_time' | 'end_time', value: string) {
    setForm(f => {
      const schedules = { ...(f.day_schedules ?? {}) };
      const prev = schedules[day] ?? { start_time: f.start_time, end_time: f.end_time };
      schedules[day] = { ...prev, [field]: value };
      return { ...f, day_schedules: schedules };
    });
  }

  function handleSameTimeToggle(on: boolean) {
    setSameTime(on);
    if (on) {
      set('day_schedules', null);
    } else {
      const schedules: DaySchedules = {};
      for (const day of form.days_of_week) {
        schedules[day] = { start_time: form.start_time, end_time: form.end_time };
      }
      set('day_schedules', schedules);
    }
  }

  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(new Set(['name', 'venue', 'time', 'max_players']));
    setShowErrors(true);
    onAttemptSubmit?.();
    if (!isValid) {
      setTimeout(() => {
        const first = formRef.current?.querySelector('[data-field-error]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    setSubmitted(true);
    onSubmit(form);
  }

  // Check if any time slot has end <= start
  const hasTimeError = (() => {
    if (form.day_schedules) {
      return Object.values(form.day_schedules).some(s => s.end_time <= s.start_time);
    }
    return form.end_time <= form.start_time;
  })();

  // Collect all validation errors
  const errors: string[] = [];
  if (!form.name) errors.push(t('form.lessonNameRequired'));
  if (!form.venue) errors.push(t('form.venueRequired'));
  if (form.is_recurring && form.days_of_week.length === 0) errors.push(t('form.selectDay'));
  if (!form.is_recurring && !form.one_off_date) errors.push(t('form.dateRequired'));
  if (form.type === 'group' && !form.max_players) errors.push(t('form.maxRequired'));
  if (hasTimeError) errors.push(t('form.endAfterStart'));
  if (extraErrors) errors.push(...extraErrors);
  const isValid = errors.length === 0;
  const [showErrors, setShowErrors] = useState(false);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div {...(!form.name && showErrors ? { 'data-field-error': true } : {})}><label className="text-sm font-medium text-foreground mb-1 block">{t('form.lessonName')} <span className="text-destructive">*</span></label>
        <input value={form.name} onChange={e => { set('name', e.target.value); touch('name'); }} onBlur={() => touch('name')} placeholder={t('form.lessonNamePlaceholder')}
          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${touched.has('name') && !form.name ? 'border-destructive' : 'border-input'}`} />
        {touched.has('name') && !form.name && <p className="text-xs text-destructive mt-1">{t('form.lessonNameRequired')}</p>}
      </div>
      {/* Type */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{t('form.type')}</label>
        <div className="grid grid-cols-2 gap-2">
          {['group', 'individual'].map(typeVal => (
            <button type="button" key={typeVal} onClick={() => { set('type', typeVal); if (typeVal === 'individual') set('visibility', 'private'); }}
              className={`rounded-xl border-2 py-3 text-sm font-semibold capitalize transition-colors ${form.type === typeVal ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {t(`common:trainingType.${typeVal}`)}
            </button>
          ))}
        </div>
      </div>
      {/* Capacity — right after type so user sees the difference */}
      {form.type === 'group' && (
        <div {...(form.type === 'group' && !form.max_players && showErrors ? { 'data-field-error': true } : {})}><label className="text-sm font-medium text-foreground mb-1 block">{t('form.maxAthletes')} <span className="text-destructive">*</span></label>
          <input
            type="number" min={1} max={50}
            value={form.max_players || ''}
            onChange={e => set('max_players', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
            onBlur={() => touch('max_players')}
            placeholder=""
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          /></div>
      )}
      {/* Venue */}
      <div {...(!form.venue && showErrors ? { 'data-field-error': true } : {})}><label className="text-sm font-medium text-foreground mb-1 block">{t('form.venue')} <span className="text-destructive">*</span></label>
        {venueOptions && !addingNewVenue ? (
          <div className="space-y-2">
            <div className="relative">
              <select
                value={form.venue}
                onChange={e => {
                  if (e.target.value === '__new__') {
                    setAddingNewVenue(true);
                    set('venue', '');
                  } else {
                    set('venue', e.target.value);
                    touch('venue');
                  }
                }}
                onBlur={() => touch('venue')}
                className={`w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${touched.has('venue') && !form.venue ? 'border-destructive' : 'border-input'}`}
              >
                {(venueOptions.length !== 1 || !form.venue) && <option value="">{t('form.selectVenue')}</option>}
                {venueOptions.map(v => {
                  const val = `${v.name}, ${v.address}`;
                  return <option key={val} value={val}>{v.name} — {v.address}</option>;
                })}
                <option value="__new__">{t('form.addNewVenue')}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ) : addingNewVenue ? (
          <VenueAddForm
            onSave={(venue) => {
              set('venue', `${venue.name}, ${venue.address}`);
              touch('venue');
              onNewVenue?.(venue);
              setAddingNewVenue(false);
            }}
            onCancel={() => setAddingNewVenue(false)}
          />
        ) : (
          <PlaceAutocompleteInput
            value={form.venue}
            onChange={v => { set('venue', v); touch('venue'); }}
            placeholder={t('form.venueAddress')}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${touched.has('venue') && !form.venue ? 'border-destructive' : 'border-input'}`}
          />
        )}
        {touched.has('venue') && !form.venue && <p className="text-xs text-destructive mt-1">{t('form.venueRequired')}</p>}
      </div>

      {/* Frequency */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{t('form.howOften')}</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => set('is_recurring', true)}
            className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${form.is_recurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
            {t('form.everyWeek')}
          </button>
          <button type="button" onClick={() => set('is_recurring', false)}
            className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${!form.is_recurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
            {t('form.oneTime')}
          </button>
        </div>
      </div>

      {form.is_recurring ? (
        <>
          {/* Days — multi-select */}
          <div {...(form.days_of_week.length === 0 && showErrors ? { 'data-field-error': true } : {})}><label className="text-sm font-medium text-foreground mb-2 block">{t('form.days')} <span className="text-destructive">*</span></label>
            <div className="flex gap-1.5 flex-wrap">{DAYS_FULL.map((d, i) => (
              <button type="button" key={d} onClick={() => toggleDay(i)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${form.days_of_week.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{dayShortLabel(DAYS_SHORT[i])}</button>
            ))}</div>
            {form.days_of_week.length === 0 && showErrors && <p className="text-xs text-destructive mt-1">{t('form.selectDay')}</p>}
          </div>

          {/* Schedule — time per day */}
          <div {...(hasTimeError && showErrors ? { 'data-field-error': true } : {})}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">{t('form.schedule')}</label>
              {form.days_of_week.length > 1 && (
                <button type="button" onClick={() => handleSameTimeToggle(!sameTime)}
                  className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t('form.sameTime')}</span>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${sameTime ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sameTime ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}
            </div>
            {sameTime ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">{t('form.start')}</label>
                  <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">{t('form.end')}</label>
                  <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} /></div>
              </div>
            ) : (
              <div className="space-y-2">
                {form.days_of_week.map(day => {
                  const sched = form.day_schedules?.[day] ?? { start_time: form.start_time, end_time: form.end_time };
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground w-10 shrink-0">{dayShortLabel(DAYS_SHORT[day])}</span>
                      <TimeSelect value={sched.start_time} onChange={v => setDayTime(day, 'start_time', v)} compact />
                      <span className="text-muted-foreground text-xs">–</span>
                      <TimeSelect value={sched.end_time} onChange={v => setDayTime(day, 'end_time', v)} compact />
                    </div>
                  );
                })}
              </div>
            )}
            {hasTimeError && <p className="text-xs text-destructive mt-2">{t('form.endAfterStart')}</p>}
          </div>

          {/* Start / End dates */}
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-foreground mb-1 block">{t('form.starts')}</label>
              <input data-transparent type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">{t('form.ends')} <span className="text-muted-foreground font-normal">{t('form.optional')}</span></label>
              <input data-transparent type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          </div>
          {!form.end_date && <p className="text-xs text-muted-foreground -mt-3">{t('form.noEndDate')}</p>}
        </>
      ) : (
        <>
          <div {...(!form.one_off_date && showErrors ? { 'data-field-error': true } : {})}><label className="text-sm font-medium text-foreground mb-1 block">{t('form.date')}</label>
            <input data-transparent type="date" required value={form.one_off_date} onChange={e => set('one_off_date', e.target.value)}
              className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-foreground mb-1 block">{t('form.startTime')}</label>
              <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">{t('form.endTime')}</label>
              <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} /></div>
          </div>
          {hasTimeError && <p className="text-xs text-destructive">{t('form.endAfterStart')}</p>}
        </>
      )}
      {/* Booking Mode */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">{t('form.joining')}</label>
        <p className="text-xs text-muted-foreground mb-2">{t('form.joiningDesc')}</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'instant', l: t('form.instantJoin') }, { v: 'approval', l: t('form.approvalRequired') }].map(({ v, l }) => (
            <button type="button" key={v} onClick={() => set('booking_mode', v)}
              className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.booking_mode === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
          ))}
        </div>
      </div>
      {/* Visibility — only for group trainings (individual is always private) */}
      {form.type === 'group' && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{t('form.visibility')}</label>
          <p className="text-xs text-muted-foreground mb-2">{t('form.visibilityDesc')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'private', l: t('form.private') }, { v: 'discoverable', l: t('form.public') }].map(({ v, l }) => (
              <button type="button" key={v} onClick={() => set('visibility', v)}
                className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.visibility === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {schoolSlot}

      {/* Cancellation deadline */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{t('form.cancelDeadline')}</label>
        <p className="text-xs text-muted-foreground mb-2">{t('form.cancelDeadlineDesc')}</p>
        <div className="grid grid-cols-5 gap-2">
          <button type="button" onClick={() => set('confirmation_window_hours', null)}
            className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors ${form.confirmation_window_hours === null ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
            {t('form.off')}
          </button>
          {[12, 24, 48, 72].map(h => (
            <button type="button" key={h} onClick={() => set('confirmation_window_hours', h)}
              className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors ${form.confirmation_window_hours === h ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {t('form.hours', { h })}
            </button>
          ))}
        </div>
      </div>

      {/* Validation errors */}
      {showErrors && errors.length > 0 && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-destructive">{err}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      {mode === 'edit' ? (
        <>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">{t('common:actions.cancel')}</button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60 min-h-[44px]">
              {submitting ? t('form.saving') : (submitLabel ?? t('form.save'))}
            </button>
          </div>
          {onDelete && (
            <div className="border-t border-border pt-5">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px]">
                  <Trash2 className="h-4 w-4" /> {t('form.deleteTraining')}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-destructive text-center font-medium">{t('form.deleteConfirm')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">{t('common:actions.cancel')}</button>
                    <button type="button" onClick={onDelete} className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground min-h-[44px]">{t('detail.delete')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60">
          {submitting ? t('form.creating') : (submitLabel ?? t('form.createLesson'))}
        </button>
      )}
      <UnsavedChangesDialog
        blocker={blocker}
        onDiscard={() => localStorage.removeItem(DRAFT_KEY)}
      />
    </form>
  );
}
