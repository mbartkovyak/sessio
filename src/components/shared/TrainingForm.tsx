import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { DAYS_FULL, DAYS_SHORT } from '@/lib/constants';

/** Generate time options in 5-minute increments (00:00 – 23:55) */
function useTimeOptions() {
  return useMemo(() => {
    const opts: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return opts;
  }, []);
}

function TimeSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const options = useTimeOptions();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className ?? 'w-full appearance-none rounded-xl border border-input bg-background px-3 py-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]'}
      >
        {options.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
  confirmation_window_hours: number;
  no_response_behavior: string;
  day_schedules: DaySchedules | null;
}

const defaults: TrainingFormValues = {
  name: '', type: 'group', sport: 'Tennis', venue: '',
  start_time: '09:00', end_time: '10:00', max_players: 6,
  is_recurring: true, days_of_week: [0],
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  one_off_date: '',
  confirmation_window_hours: 48, no_response_behavior: 'mark_absent',
  booking_mode: 'instant', visibility: 'private',
  day_schedules: null,
};

export type VenueOption = { name: string; address: string };

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
}

export default function TrainingForm({ mode, initialValues, onSubmit, submitting, submitLabel, onCancel, onDelete, schoolSlot, venueOptions }: Props) {
  const [form, setForm] = useState<TrainingFormValues>({ ...defaults, ...initialValues });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sameTime, setSameTime] = useState(() => !initialValues?.day_schedules);

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

  const set = (k: keyof TrainingFormValues, v: any) => setForm(f => ({ ...f, [k]: v }));

  function toggleDay(day: number) {
    setForm(f => {
      const newDays = f.days_of_week.includes(day)
        ? (f.days_of_week.length > 1 ? f.days_of_week.filter(d => d !== day) : f.days_of_week)
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
      schedules[day] = { start_time: schedules[day]?.start_time ?? f.start_time, end_time: schedules[day]?.end_time ?? f.end_time, [field]: value };
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const isValid = !!form.name && !!form.venue && (form.is_recurring || !!form.one_off_date);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {['group', 'individual'].map(t => (
            <button type="button" key={t} onClick={() => { set('type', t); if (t === 'individual') set('visibility', 'private'); }}
              className={`rounded-xl border-2 py-3 text-sm font-semibold capitalize transition-colors ${form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Name */}
      <div><label className="text-sm font-medium text-foreground mb-1 block">Lesson Name</label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wednesday Tennis" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      {/* Venue */}
      <div><label className="text-sm font-medium text-foreground mb-1 block">Venue</label>
        {venueOptions && venueOptions.length > 0 ? (
          <div className="relative">
            <select
              value={form.venue}
              onChange={e => set('venue', e.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            >
              {venueOptions.length > 1 && <option value="">Select venue</option>}
              {venueOptions.map(v => {
                const val = `${v.name}, ${v.address}`;
                return <option key={val} value={val}>{v.name} — {v.address}</option>;
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <input required value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Court 3, City Sports Center" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
        )}</div>

      {/* Frequency */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">How often?</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => set('is_recurring', true)}
            className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${form.is_recurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
            Every week
          </button>
          <button type="button" onClick={() => set('is_recurring', false)}
            className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${!form.is_recurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
            One time
          </button>
        </div>
      </div>

      {form.is_recurring ? (
        <>
          {/* Days — multi-select */}
          <div><label className="text-sm font-medium text-foreground mb-2 block">Days</label>
            <div className="flex gap-1.5 flex-wrap">{DAYS_FULL.map((d, i) => (
              <button type="button" key={d} onClick={() => toggleDay(i)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${form.days_of_week.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0, 3)}</button>
            ))}</div>
          </div>

          {/* Schedule — time per day */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">Schedule</label>
              {form.days_of_week.length > 1 && (
                <button type="button" onClick={() => handleSameTimeToggle(!sameTime)}
                  className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Same time</span>
                  <div className={`relative h-5 w-9 rounded-full transition-colors ${sameTime ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${sameTime ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}
            </div>
            {sameTime ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Start</label>
                  <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">End</label>
                  <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} /></div>
              </div>
            ) : (
              <div className="space-y-2">
                {form.days_of_week.map(day => {
                  const sched = form.day_schedules?.[day] ?? { start_time: form.start_time, end_time: form.end_time };
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground w-10 shrink-0">{DAYS_SHORT[day]}</span>
                      <TimeSelect value={sched.start_time} onChange={v => setDayTime(day, 'start_time', v)}
                        className="flex-1 appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]" />
                      <span className="text-muted-foreground text-xs">–</span>
                      <TimeSelect value={sched.end_time} onChange={v => setDayTime(day, 'end_time', v)}
                        className="flex-1 appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start / End dates */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-foreground mb-1 block">Starts</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Ends <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          </div>
          {!form.end_date && <p className="text-xs text-muted-foreground -mt-3">No end date = ongoing, sessions generated rolling</p>}
        </>
      ) : (
        <>
          <div><label className="text-sm font-medium text-foreground mb-1 block">Date</label>
            <input type="date" required value={form.one_off_date} onChange={e => set('one_off_date', e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-foreground mb-1 block">Start time</label>
              <TimeSelect value={form.start_time} onChange={v => set('start_time', v)} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">End time</label>
              <TimeSelect value={form.end_time} onChange={v => set('end_time', v)} /></div>
          </div>
        </>
      )}
      {/* Capacity */}
      {form.type === 'group' && (
        <div><label className="text-sm font-medium text-foreground mb-1 block">Max Athletes</label>
          <input type="number" min={1} max={50} value={form.max_players} onChange={e => set('max_players', Number(e.target.value))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      )}
      {/* Booking Mode */}
      <div><label className="text-sm font-medium text-foreground mb-2 block">Joining</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'instant', l: 'Instant Join' }, { v: 'approval', l: 'Approval Required' }].map(({ v, l }) => (
            <button type="button" key={v} onClick={() => set('booking_mode', v)}
              className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.booking_mode === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
          ))}
        </div></div>
      {/* Visibility — only for group trainings (individual is always private) */}
      {form.type === 'group' && (
        <div><label className="text-sm font-medium text-foreground mb-2 block">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'private', l: 'Invite Only' }, { v: 'discoverable', l: 'Discoverable' }].map(({ v, l }) => (
              <button type="button" key={v} onClick={() => set('visibility', v)}
                className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.visibility === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {schoolSlot}

      {/* Confirmation settings */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Confirmation deadline</label>
        <p className="text-xs text-muted-foreground mb-2">How many hours before the lesson athletes must confirm</p>
        <div className="grid grid-cols-4 gap-2">
          {[12, 24, 48, 72].map(h => (
            <button type="button" key={h} onClick={() => set('confirmation_window_hours', h)}
              className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors ${form.confirmation_window_hours === h ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">If athlete doesn't respond</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'mark_absent', l: 'Mark absent' }, { v: 'keep_pending', l: 'Keep pending' }].map(({ v, l }) => (
            <button type="button" key={v} onClick={() => set('no_response_behavior', v)}
              className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.no_response_behavior === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {mode === 'edit' ? (
        <>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
            <button type="submit" disabled={submitting || !isValid}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60 min-h-[44px]">
              {submitting ? 'Saving...' : (submitLabel ?? 'Save')}
            </button>
          </div>
          {onDelete && (
            <div className="border-t border-border pt-5">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px]">
                  <Trash2 className="h-4 w-4" /> Delete Training
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-destructive text-center font-medium">Are you sure? This can't be undone.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
                    <button type="button" onClick={onDelete} className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground min-h-[44px]">Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <button type="submit" disabled={submitting || !isValid}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60">
          {submitting ? 'Creating...' : (submitLabel ?? 'Create Lesson')}
        </button>
      )}
    </form>
  );
}
