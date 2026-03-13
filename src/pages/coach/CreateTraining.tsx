import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useCreateTraining } from '@/hooks/useTrainings';

const SPORTS = ['Tennis','Swimming','Running','Fitness','Yoga','Football','Badminton','Boxing','Other'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function CreateTraining() {
  const navigate = useNavigate();
  const create = useCreateTraining();
  const [form, setForm] = useState({
    name:'', type:'group', sport:'Tennis', venue:'', day_of_week:0,
    start_time:'09:00', end_time:'10:00', max_players:6,
    confirmation_window_hours:48, no_response_behavior:'mark_absent',
    booking_mode:'instant', visibility:'private', notification_channel:'push_email',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...form, start_time: form.start_time + ':00', end_time: form.end_time + ':00' };
    if (form.type === 'individual') delete payload.max_players;
    const training = await create.mutateAsync(payload);
    navigate(`/coach/trainings/${training.id}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-semibold text-foreground">New Training</h1>
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
          <div><label className="text-sm font-medium text-foreground mb-1 block">Training Name</label>
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
          {/* Day */}
          <div><label className="text-sm font-medium text-foreground mb-2 block">Day of Week</label>
            <div className="flex gap-1 flex-wrap">{DAYS.map((d, i) => (
              <button type="button" key={d} onClick={() => set('day_of_week', i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.day_of_week === i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0,3)}</button>
            ))}</div></div>
          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-foreground mb-1 block">Start</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">End</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
          </div>
          {/* Capacity */}
          {form.type === 'group' && (
            <div><label className="text-sm font-medium text-foreground mb-1 block">Max Players</label>
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
          <button type="submit" disabled={create.isPending || !form.name || !form.venue}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60">
            {create.isPending ? 'Creating...' : 'Create Training'}
          </button>
        </form>
      </main>
      <CoachBottomNav />
    </div>
  );
}
