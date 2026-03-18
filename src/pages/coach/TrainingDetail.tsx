import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Calendar, MessageCircle, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions, useUpdateTraining } from '@/hooks/training/useTrainings';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import ChatView from '@/components/shared/ChatView';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function ChatTab({ trainingId }: { trainingId: string }) {
  return <ChatView trainingId={trainingId} className="max-w-md mx-auto w-full" style={{ height: 'calc(100dvh - 180px)' }} />;
}

const SPORTS = ['Tennis','Swimming','Running','Fitness','Yoga','Football','Badminton','Boxing','Other'];

function SettingsTab({ training, onDelete }: { training: any; onDelete: () => void }) {
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
  }

  async function handleDelete() {
    const { error } = await supabase
      .from('trainings' as any)
      .update({ is_active: false })
      .eq('id', training.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Training deleted');
      onDelete();
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
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
        <label className="text-sm font-medium text-foreground mb-2 block">Days <span className="text-muted-foreground font-normal">(tap multiple)</span></label>
        <div className="flex gap-1 flex-wrap">
          {DAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => setSelectedDays(prev => prev.includes(i) ? (prev.length > 1 ? prev.filter(x => x !== i) : prev) : [...prev, i].sort())}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selectedDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{d.slice(0,3)}</button>
          ))}
        </div>
        {selectedDays.length > 1 && <p className="text-xs text-muted-foreground mt-1.5">{selectedDays.length}x/week</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
        </div>
      </div>
      {training.type === 'group' && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Max Athletes</label>
          <input type="number" min={1} max={50} value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]" />
        </div>
      )}
      <button onClick={handleSave} disabled={update.isPending || !name || !venue}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60 min-h-[48px]">
        {update.isPending ? 'Saving...' : 'Save Changes'}
      </button>

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
              <button onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-border py-3 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
              <button onClick={handleDelete}
                className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground min-h-[44px]">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'invite';
  const { data: training, isLoading, error: trainingError } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const removeMember = useRemoveTrainingMember(id!);

  const inviteLink = training ? `${window.location.origin}/join/${training.invite_code}` : '';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 px-6">
      <p className="text-muted-foreground">Training not found</p>
      {trainingError && <p className="text-xs text-destructive text-center max-w-sm">{(trainingError as any).message}</p>}
      <button onClick={() => navigate('/coach/trainings')} className="text-sm text-primary font-medium">Back to Trainings</button>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter((s: any) => s.session_date >= today);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{training.name}</h1>
            <p className="text-xs text-muted-foreground">{training.sport} · {(training.days_of_week ?? [training.day_of_week]).map((d: number) => DAYS[d]).filter(Boolean).join(', ')} · {training.start_time?.slice(0,5)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 pb-24">
        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1">
          <div className="sticky top-[65px] z-10 bg-card border-b border-border">
            <div className="max-w-md mx-auto px-4">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
              {[{v:'invite',l:'Invite',icon:Share2},{v:'members',l:'Members',icon:Users},{v:'schedule',l:'Schedule',icon:Calendar},{v:'chat',l:'Chat',icon:MessageCircle},{v:'settings',l:'Settings',icon:Settings}].map(({v,l,icon:Icon}) => (
                <TabsTrigger key={v} value={v} className="flex-1 flex items-center gap-1.5 rounded-none border-b-2 border-transparent py-3 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Icon className="h-3.5 w-3.5" />{l}
                </TabsTrigger>
              ))}
            </TabsList>
            </div>
          </div>

          <TabsContent value="invite" className="mt-0 py-6 space-y-4 max-w-md mx-auto px-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-2">Share this link with your athletes</p>
              <p className="text-xs font-mono text-foreground break-all">{inviteLink}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!'); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground min-h-[48px]">
              <Copy className="h-4 w-4" /> Copy Invite Link
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join ${training.name} on Sessio! ${inviteLink}`)}`} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] min-h-[48px]">
              💬 Share via WhatsApp
            </a>
          </TabsContent>

          <TabsContent value="members" className="mt-0 py-4 max-w-md mx-auto px-4">
            <p className="text-sm text-muted-foreground mb-4">{members.filter((m: any) => m.role === 'regular').length} active · {members.filter((m: any) => m.role === 'waitlist').length} waitlist</p>
            {members.length === 0 ? <div className="text-center py-8"><p className="text-muted-foreground text-sm">No members yet. Share the invite link!</p></div> :
              <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
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
                          <p className="text-xs text-muted-foreground">{p?.email}</p>
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
            }
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 py-4 space-y-2 max-w-md mx-auto px-4">
            {upcoming.length === 0 ? <div className="text-center py-8"><p className="text-muted-foreground text-sm">No upcoming trainings</p></div> :
              upcoming.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-foreground">{format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM')}</p>
                    <p className="text-xs text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{s.status}</span>
                </div>
              ))
            }
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            {id && <ChatTab trainingId={id} />}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsTab training={training} onDelete={() => navigate('/coach/trainings')} />
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNav />
    </div>
  );
}
