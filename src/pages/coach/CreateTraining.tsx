import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useCreateTraining } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SPORTS = ['Tennis','Swimming','Running','Fitness','Yoga','Football','Badminton','Boxing','Other'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function getNextDayDate(dayOfWeek: number): string {
  const today = new Date();
  const todayDay = (today.getDay() + 6) % 7; // Monday=0
  const diff = ((dayOfWeek - todayDay) + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().split('T')[0];
}

export default function CreateTraining() {
  const navigate = useNavigate();
  const create = useCreateTraining();
  const { profile } = useAuth();
  const { data: school } = useMySchool();
  const isSchoolOwner = profile?.role === 'school_owner';
  const hasSchool = !!school;
  const schoolCoaches = (school as any)?.school_members ?? [];
  const [isSchoolTraining, setIsSchoolTraining] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [form, setForm] = useState({
    name:'', type:'group', sport:'Tennis', venue:'',
    start_time:'09:00', end_time:'10:00', max_players:6,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    one_off_date:'',
    confirmation_window_hours:48, no_response_behavior:'mark_absent',
    booking_mode:'instant', visibility:'private', notification_channel:'push_email',
  });

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) : [...prev, day].sort()
    );
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        ...form,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        is_recurring: isRecurring,
        days_of_week: isRecurring ? selectedDays : undefined,
        day_of_week: isRecurring ? selectedDays[0] : undefined,
        start_date: isRecurring ? (form.start_date || getNextDayDate(selectedDays[0])) : form.one_off_date,
        end_date: isRecurring ? (form.end_date || null) : form.one_off_date,
      };
      delete payload.one_off_date;
      if (form.type === 'individual') delete payload.max_players;
      if (hasSchool && isSchoolTraining) {
        payload.school_id = school.id;
        if (isSchoolOwner && selectedCoachId) payload.coach_id = selectedCoachId;
      }
      if (!isRecurring) {
        const d = new Date(form.one_off_date + 'T00:00:00');
        payload.day_of_week = (d.getDay() + 6) % 7;
        payload.days_of_week = [payload.day_of_week];
      }
      const training = await create.mutateAsync(payload);
      const { error: rpcError } = await supabase.rpc('generate_sessions_for_training' as any, { p_training_id: training.id });
      if (rpcError) {
        console.warn('Session generation failed:', rpcError.message);
        toast.error('Training created but session generation failed.');
      }
      navigate(`/coach/trainings/${training.id}`);
    } catch (err: any) {
      console.error('Create training error:', err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-semibold text-foreground">New Lesson</h1>
      </header>
      <main className="flex-1 pb-24">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-6 space-y-5">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['group','individual'].map(t => (
                <button type="button" key={t} onClick={() => set('type', t)}
                  className={`rounded-xl border-2 py-3 text-sm font-semibold capitalize transition-colors ${form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Name */}
          <div><label className="text-sm font-medium text-foreground mb-1 block">Lesson Name</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wednesday Tennis" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          {/* Sport */}
          <div><label className="text-sm font-medium text-foreground mb-2 block">Sport</label>
            <div className="flex flex-wrap gap-2">{SPORTS.map(s => (
              <button type="button" key={s} onClick={() => set('sport', s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${form.sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{s}</button>
            ))}</div></div>
          {/* Venue */}
          <div><label className="text-sm font-medium text-foreground mb-1 block">Venue</label>
            <input required value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Court 3, City Sports Center" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>

          {/* Frequency */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">How often?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsRecurring(true)}
                className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${isRecurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
                Every week
              </button>
              <button type="button" onClick={() => setIsRecurring(false)}
                className={`rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${!isRecurring ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>
                One time
              </button>
            </div>
          </div>

          {isRecurring ? (
            <>
              {/* Days — multi-select */}
              <div><label className="text-sm font-medium text-foreground mb-2 block">Days <span className="text-muted-foreground font-normal">(tap multiple)</span></label>
                <div className="flex gap-1 flex-wrap">{DAYS.map((d, i) => (
                  <button type="button" key={d} onClick={() => toggleDay(i)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selectedDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0,3)}</button>
                ))}</div>
                {selectedDays.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1.5">{selectedDays.length} days/week — {selectedDays.map(d => DAYS[d].slice(0,3)).join(', ')}</p>
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
            /* One-off date */
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
              {[{v:'instant',l:'Instant Join'},{v:'approval',l:'Approval Required'}].map(({v,l}) => (
                <button type="button" key={v} onClick={() => set('booking_mode', v)}
                  className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.booking_mode === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
              ))}
            </div></div>
          {/* Visibility */}
          <div><label className="text-sm font-medium text-foreground mb-2 block">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {[{v:'private',l:'Invite Only'},{v:'discoverable',l:'Discoverable'}].map(({v,l}) => (
                <button type="button" key={v} onClick={() => set('visibility', v)}
                  className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.visibility === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{l}</button>
              ))}
            </div></div>
          {/* School association */}
          {hasSchool && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-sm font-medium text-foreground">{school.name}</p>
                <button
                  type="button"
                  onClick={() => setIsSchoolTraining(v => !v)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${isSchoolTraining ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isSchoolTraining ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {/* Coach picker — school owner must assign a coach */}
              {isSchoolOwner && isSchoolTraining && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Coach</label>
                  {schoolCoaches.length === 0 ? (
                    <p className="text-sm text-destructive">No coaches in your school yet. Add coaches before creating trainings.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedCoachId}
                        onChange={e => setSelectedCoachId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                      >
                        <option value="">Select coach</option>
                        {schoolCoaches.map((m: any) => (
                          <option key={m.coach_id} value={m.coach_id}>
                            {m.coach?.full_name ?? 'Coach'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Advanced settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">Advanced settings</span>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-4">
                {/* Confirmation deadline */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Confirmation deadline</label>
                  <p className="text-xs text-muted-foreground mb-2">How many hours before the session athletes must confirm</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 24, 48, 72].map(h => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => set('confirmation_window_hours', h)}
                        className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors ${form.confirmation_window_hours === h ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
                {/* No response behavior */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">If athlete doesn't respond</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: 'mark_absent', l: 'Mark absent' }, { v: 'keep_pending', l: 'Keep pending' }].map(({ v, l }) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => set('no_response_behavior', v)}
                        className={`rounded-xl border-2 py-3 text-xs font-semibold transition-colors ${form.no_response_behavior === v ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button type="submit" disabled={create.isPending || !form.name || !form.venue || (!isRecurring && !form.one_off_date) || (isSchoolOwner && hasSchool && isSchoolTraining && !selectedCoachId)}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60">
            {create.isPending ? 'Creating...' : 'Create Lesson'}
          </button>
        </form>
      </main>
      <CoachBottomNav />
    </div>
  );
}
