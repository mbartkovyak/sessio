import { useState, useEffect } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { DAYS_FULL } from '@/lib/constants';

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

  useEffect(() => {
    if (initialValues) setForm(f => ({ ...defaults, ...initialValues }));
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
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? (f.days_of_week.length > 1 ? f.days_of_week.filter(d => d !== day) : f.days_of_week)
        : [...f.days_of_week, day].sort(),
    }));
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
          <div><label className="text-sm font-medium text-foreground mb-2 block">Days <span className="text-muted-foreground font-normal">(tap multiple)</span></label>
            <div className="flex gap-1 flex-wrap">{DAYS_FULL.map((d, i) => (
              <button type="button" key={d} onClick={() => toggleDay(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${form.days_of_week.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0, 3)}</button>
            ))}</div>
            {form.days_of_week.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1.5">{form.days_of_week.length} days/week — {form.days_of_week.map(d => DAYS_FULL[d].slice(0, 3)).join(', ')}</p>
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
        <div><label className="text-sm font-medium text-foreground mb-1 block">Date</label>
          <input type="date" required value={form.one_off_date} onChange={e => set('one_off_date', e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      )}

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm font-medium text-foreground mb-1 block">Start time</label>
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
        <div><label className="text-sm font-medium text-foreground mb-1 block">End time</label>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      </div>
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
