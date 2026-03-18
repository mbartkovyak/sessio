import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Calendar, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions } from '@/hooks/training/useTrainings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import ChatView from '@/components/shared/ChatView';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function ChatTab({ trainingId }: { trainingId: string }) {
  return <ChatView trainingId={trainingId} className="max-w-md mx-auto w-full" style={{ height: 'calc(100dvh - 180px)' }} />;
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
            <p className="text-xs text-muted-foreground">{training.sport} · {DAYS[training.day_of_week]} · {training.start_time?.slice(0,5)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 pb-24">
        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1">
          <div className="sticky top-[65px] z-10 bg-card border-b border-border">
            <div className="max-w-md mx-auto px-4">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
              {[{v:'invite',l:'Invite',icon:Share2},{v:'members',l:'Members',icon:Users},{v:'schedule',l:'Schedule',icon:Calendar},{v:'chat',l:'Chat',icon:MessageCircle}].map(({v,l,icon:Icon}) => (
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
        </Tabs>
      </div>

      <CoachBottomNav />
    </div>
  );
}
