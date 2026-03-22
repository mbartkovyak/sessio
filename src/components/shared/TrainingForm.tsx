import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { DAYS_FULL, DAYS_SHORT } from '@/lib/constants';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));


function TimeSelect({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [h, m] = (value || '09:00').split(':');
  const sel = 'appearance-none bg-transparent text-sm font-medium text-foreground text-center focus:outline-none w-9';
  return (
    <div className={compact
      ? 'inline-flex items-center rounded-lg border border-input bg-background px-1.5 py-2 min-h-[40px]'
      : 'inline-flex items-center rounded-xl border border-input bg-background px-3 py-3 min-h-[44px]'
    }>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} className={sel}>
        {HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-sm font-medium text-muted-foreground">:</span>
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
  confirmation_window_hours: number;
  day_schedules: DaySchedules | null;
}

const defaults: TrainingFormValues = {
  name: '', type: 'group', sport: 'Tennis', venue: '',
  start_time: '09:00', end_time: '10:00', max_players: 6,
  is_recurring: true, days_of_week: [0],
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  one_off_date: '',
  confirmation_window_hours: 48,
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
  /** Called when user creates a new venue inline (saves to school) */
  onNewVenue?: (venue: VenueOption) => void;
  /** Extra validation errors from parent (e.g. "Select a coach") */
  extraErrors?: string[];
}

export default function TrainingForm({ mode, initialValues, onSubmit, submitting, submitLabel, onCancel, onDelete, schoolSlot, venueOptions, onNewVenue, extraErrors }: Props) {
  const [form, setForm] = useState<TrainingFormValues>({ ...defaults, ...initialValues });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingNewVenue, setAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
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

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (field: string) => setTouched(t => new Set(t).add(field));

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
    setTouched(new Set(['name', 'venue', 'time']));
    setShowErrors(true);
    if (!isValid) {
      // Scroll to top of form so user sees the errors
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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
  if (!form.name) errors.push('Lesson name is required');
  if (!form.venue) errors.push('Venue is required');
  if (!form.is_recurring && !form.one_off_date) errors.push('Date is required for one-time lessons');
  if (form.type === 'group' && !form.max_players) errors.push('Max athletes is required');
  if (hasTimeError) errors.push('End time must be after start time');
  if (extraErrors) errors.push(...extraErrors);
  const isValid = errors.length === 0;
  const [showErrors, setShowErrors] = useState(false);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
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
      <div><label className="text-sm font-medium text-foreground mb-1 block">Lesson Name <span className="text-destructive">*</span></label>
        <input value={form.name} onChange={e => { set('name', e.target.value); touch('name'); }} onBlur={() => touch('name')} placeholder="e.g. Wednesday Tennis"
          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${touched.has('name') && !form.name ? 'border-destructive' : 'border-input'}`} />
        {touched.has('name') && !form.name && <p className="text-xs text-destructive mt-1">Lesson name is required</p>}
      </div>
      {/* Venue */}
      <div><label className="text-sm font-medium text-foreground mb-1 block">Venue <span className="text-destructive">*</span></label>
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
                {(venueOptions.length !== 1 || !form.venue) && <option value="">Select venue</option>}
                {venueOptions.map(v => {
                  const val = `${v.name}, ${v.address}`;
                  return <option key={val} value={val}>{v.name} — {v.address}</option>;
                })}
                <option value="__new__">+ Add new venue</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ) : addingNewVenue ? (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <input
              value={newVenueName}
              onChange={e => setNewVenueName(e.target.value)}
              placeholder="Venue name (e.g. Court 3)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <PlaceAutocompleteInput
              value={newVenueAddress}
              onChange={setNewVenueAddress}
              placeholder="Full address (e.g. ul. Marszałkowska 12, Warszawa)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAddingNewVenue(false); setNewVenueName(''); setNewVenueAddress(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newVenueName.trim() || !newVenueAddress.trim()}
                onClick={() => {
                  const venue = { name: newVenueName.trim(), address: newVenueAddress.trim() };
                  set('venue', `${venue.name}, ${venue.address}`);
                  touch('venue');
                  onNewVenue?.(venue);
                  setAddingNewVenue(false);
                  setNewVenueName('');
                  setNewVenueAddress('');
                }}
                className="text-xs font-medium text-primary disabled:opacity-40"
              >
                Add venue
              </button>
            </div>
          </div>
        ) : (
          <PlaceAutocompleteInput
            value={form.venue}
            onChange={v => { set('venue', v); touch('venue'); }}
            placeholder="Full address (e.g. ul. Marszałkowska 12, Warszawa)"
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${touched.has('venue') && !form.venue ? 'border-destructive' : 'border-input'}`}
          />
        )}
        {touched.has('venue') && !form.venue && <p className="text-xs text-destructive mt-1">Venue is required</p>}
      </div>

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
                  <span>Same time all days</span>
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
                      <TimeSelect value={sched.start_time} onChange={v => setDayTime(day, 'start_time', v)} compact />
                      <span className="text-muted-foreground text-xs">–</span>
                      <TimeSelect value={sched.end_time} onChange={v => setDayTime(day, 'end_time', v)} compact />
                    </div>
                  );
                })}
              </div>
            )}
            {hasTimeError && <p className="text-xs text-destructive mt-2">End time must be after start time</p>}
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
          {hasTimeError && <p className="text-xs text-destructive">End time must be after start time</p>}
        </>
      )}
      {/* Capacity */}
      {form.type === 'group' && (
        <div><label className="text-sm font-medium text-foreground mb-1 block">Max Athletes <span className="text-destructive">*</span></label>
          <input
            type="number" min={1} max={50}
            value={form.max_players || ''}
            onChange={e => set('max_players', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
            onBlur={() => touch('max_players')}
            placeholder=""
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          /></div>
      )}
      {/* Booking Mode */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Joining</label>
        <p className="text-xs text-muted-foreground mb-2">How athletes join when they open the invite link</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'instant', l: 'Instant Join' }, { v: 'approval', l: 'Approval Required' }].map(({ v, l }) => (
            <button type="button" key={v} onClick={() => set('booking_mode', v)}
              className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.booking_mode === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
          ))}
        </div>
      </div>
      {/* Visibility — only for group trainings (individual is always private) */}
      {form.type === 'group' && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Visibility</label>
          <p className="text-xs text-muted-foreground mb-2">Whether athletes can find this lesson in search</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'private', l: 'Private' }, { v: 'discoverable', l: 'Public' }].map(({ v, l }) => (
              <button type="button" key={v} onClick={() => set('visibility', v)}
                className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.visibility === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {schoolSlot}

      {/* Cancellation deadline */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Cancellation deadline</label>
        <p className="text-xs text-muted-foreground mb-2">How many hours before the lesson athletes can cancel for free</p>
        <div className="grid grid-cols-4 gap-2">
          {[12, 24, 48, 72].map(h => (
            <button type="button" key={h} onClick={() => set('confirmation_window_hours', h)}
              className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors ${form.confirmation_window_hours === h ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
              {h}h
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
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
            <button type="submit" disabled={submitting}
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
        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60">
          {submitting ? 'Creating...' : (submitLabel ?? 'Create Lesson')}
        </button>
      )}
    </form>
  );
}
