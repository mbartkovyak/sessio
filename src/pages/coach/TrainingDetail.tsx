import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Trash2, Settings, MapPin, Clock, CalendarDays, Edit3, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions, useUpdateTraining } from '@/hooks/training/useTrainings';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SPORTS = ['Tennis','Swimming','Running','Fitness','Yoga','Football','Badminton','Boxing','Other'];
const SPORT_ICONS: Record<string, string> = { Tennis:'🎾',Swimming:'🏊',Running:'🏃',Fitness:'💪',Yoga:'🧘',Football:'⚽',Badminton:'🏸',Boxing:'🥊',Other:'🎯' };

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: training, isLoading, error: trainingError } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const removeMember = useRemoveTrainingMember(id!);
  const [showEdit, setShowEdit] = useState(false);

  const inviteLink = training ? `${window.location.origin}/join/${training.invite_code}` : '';
  const shareText = training ? `Join ${training.name} on Sessio!\n${inviteLink}` : '';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 px-6">
      <p className="text-muted-foreground">Training not found</p>
      {trainingError && <p className="text-xs text-destructive text-center max-w-sm">{(trainingError as any).message}</p>}
      <button onClick={() => navigate('/coach/trainings')} className="text-sm text-primary font-medium">Back to Trainings</button>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter((s: any) => s.session_date >= today).slice(0, 5);
  const regularMembers = members.filter((m: any) => m.role === 'regular');
  const waitlistMembers = members.filter((m: any) => m.role === 'waitlist');
  const daysLabel = (training.days_of_week ?? [training.day_of_week]).map((d: number) => DAYS_SHORT[d]).filter(Boolean).join(', ');

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: training.name, text: shareText }); } catch {}
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied!');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{training.name}</h1>
            <p className="text-xs text-muted-foreground">{training.sport} · {daysLabel} · {training.start_time?.slice(0,5)}</p>
          </div>
          <button onClick={() => setShowEdit(!showEdit)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {showEdit ? (
          <EditSection training={training} onClose={() => setShowEdit(false)} onDelete={() => navigate('/coach/trainings')} />
        ) : (
          <div className="max-w-md mx-auto px-4 py-5 space-y-6">

            {/* Training info card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{SPORT_ICONS[training.sport] ?? '🎯'}</span>
                <div>
                  <p className="font-semibold text-foreground">{training.name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{training.type}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> {daysLabel}</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /> {training.start_time?.slice(0,5)} – {training.end_time?.slice(0,5)}</div>
                {training.venue && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {training.venue}</div>}
                {training.type === 'group' && <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0" /> {regularMembers.length}/{training.max_players ?? '∞'} athletes</div>}
              </div>
            </div>

            {/* Invite */}
            <div>
              <h2 className="font-semibold text-foreground text-sm mb-3">Invite Athletes</h2>
              <div className="flex gap-2">
                <button onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform">
                  <Share2 className="h-4 w-4" /> Share link
                </button>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-border hover:bg-secondary shrink-0">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] min-h-[44px] mt-2">
                💬 WhatsApp
              </a>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Members <span className="text-muted-foreground font-normal">({members.length})</span></h2>
              </div>
              {members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No members yet — share the invite link</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {members.map((m: any) => {
                    const p = m.profiles;
                    const initials = p?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2) ?? '?';
                    return (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary overflow-hidden">
                            {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{p?.full_name ?? p?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${m.role === 'waitlist' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{m.role}</span>
                          <button onClick={() => removeMember.mutate(m.id)} className="text-xs text-destructive font-medium min-h-[36px] px-2">Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming sessions */}
            <div>
              <h2 className="font-semibold text-foreground text-sm mb-3">Upcoming Sessions</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM')}</p>
                        <p className="text-xs text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}

// ── Edit Section ──

function EditSection({ training, onClose, onDelete }: { training: any; onClose: () => void; onDelete: () => void }) {
  const update = useUpdateTraining(training.id);
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [venue, setVenue] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (training) {
      setName(training.name ?? '');
      setSport(training.sport ?? '');
      setVenue(training.venue ?? '');
      setSelectedDays(training.days_of_week ?? [training.day_of_week ?? 0]);
      setStartTime(training.start_time?.slice(0, 5) ?? '09:00');
      setEndTime(training.end_time?.slice(0, 5) ?? '10:00');
      setMaxPlayers(training.max_players ?? 6);
    }
  }, [training]);

  async function handleSave() {
    await update.mutateAsync({
      name, sport, venue, day_of_week: selectedDays[0], days_of_week: selectedDays,
      start_time: startTime + ':00', end_time: endTime + ':00',
      max_players: training.type === 'group' ? maxPlayers : undefined,
    });
    toast.success('Training updated');
    onClose();
  }

  async function handleDelete() {
    const { error } = await supabase
      .from('trainings' as any)
      .update({ is_active: false })
      .eq('id', training.id);
    if (error) toast.error(error.message);
    else { toast.success('Training deleted'); onDelete(); }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Sport</label>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map(s => (
            <button key={s} type="button" onClick={() => setSport(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Venue</label>
        <input value={venue} onChange={e => setVenue(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Days</label>
        <div className="flex gap-1 flex-wrap">
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => setSelectedDays(prev => prev.includes(i) ? (prev.length > 1 ? prev.filter(x => x !== i) : prev) : [...prev, i].sort())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selectedDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0,3)}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm font-medium text-foreground mb-1 block">Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
        <div><label className="text-sm font-medium text-foreground mb-1 block">End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      </div>
      {training.type === 'group' && (
        <div><label className="text-sm font-medium text-foreground mb-1 block">Max Athletes</label>
          <input type="number" min={1} max={50} value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" /></div>
      )}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
        <button onClick={handleSave} disabled={update.isPending || !name || !venue}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60 min-h-[44px]">
          {update.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="border-t border-border pt-5">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px]">
            <Trash2 className="h-4 w-4" /> Delete Training
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-destructive text-center font-medium">Are you sure? This can't be undone.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
              <button onClick={handleDelete} className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground min-h-[44px]">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
