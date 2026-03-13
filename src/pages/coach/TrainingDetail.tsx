import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Calendar, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions } from '@/hooks/useTrainings';
import { useTrainingMessages, useSendTrainingMessage } from '@/hooks/useTrainingMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function ChatTab({ trainingId }: { trainingId: string }) {
  const { user } = useAuth();
  const { data: messages = [] } = useTrainingMessages(trainingId);
  const send = useSendTrainingMessage(trainingId);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [text]);

  function handleSend() {
    if (!text.trim() || !user) return;
    send.mutate({ content: text.trim(), senderId: user.id });
    setText('');
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 180px)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && <div className="flex flex-col items-center justify-center pt-16 text-center"><MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" /><p className="font-medium text-foreground text-sm">No messages yet</p></div>}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-xs text-muted-foreground px-1">{msg.profiles?.full_name ?? 'Member'}</span>}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${isMe ? `bg-primary text-primary-foreground rounded-br-sm ${msg._optimistic ? 'opacity-70' : ''}` : 'bg-secondary text-secondary-foreground rounded-bl-sm'}`}>{msg.content}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border bg-card px-4 py-3 flex items-end gap-2">
        <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Message your group…" rows={1} className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden" />
        <button onClick={handleSend} disabled={!text.trim() || send.isPending} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform shrink-0"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: training, isLoading } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const removeMember = useRemoveTrainingMember(id!);

  const inviteLink = training ? `${window.location.origin}/join/${training.invite_code}` : '';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!training) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Training not found</p></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter((s: any) => s.session_date >= today);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">{training.name}</h1>
          <p className="text-xs text-muted-foreground">{training.sport} · {DAYS[training.day_of_week]} · {training.start_time?.slice(0,5)}</p>
        </div>
      </header>

      <div className="flex-1 pb-24">
        <Tabs defaultValue="invite" className="flex flex-col flex-1">
          <div className="sticky top-[65px] z-10 bg-card border-b border-border px-4">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
              {[{v:'invite',l:'Invite',icon:Share2},{v:'roster',l:'Roster',icon:Users},{v:'schedule',l:'Schedule',icon:Calendar},{v:'chat',l:'Chat',icon:MessageCircle}].map(({v,l,icon:Icon}) => (
                <TabsTrigger key={v} value={v} className="flex-1 flex items-center gap-1.5 rounded-none border-b-2 border-transparent py-3 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Icon className="h-3.5 w-3.5" />{l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="invite" className="mt-0 px-4 py-6 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-2">Share this link with your players</p>
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

          <TabsContent value="roster" className="mt-0 px-4 py-4">
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

          <TabsContent value="schedule" className="mt-0 px-4 py-4 space-y-2">
            {upcoming.length === 0 ? <div className="text-center py-8"><p className="text-muted-foreground text-sm">No upcoming sessions</p></div> :
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
