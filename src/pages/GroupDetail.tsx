import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Calendar, Settings, UserMinus, ChevronDown, ChevronUp, Plus, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useGroup } from '@/hooks/useGroups';
import { useGroupMembers, useRemoveMember } from '@/hooks/useGroupMembers';
import { useGroupSessions } from '@/hooks/useSessions';
import { useGroupMessages, useSendGroupMessage } from '@/hooks/useGroupMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useQueryClient } from '@tanstack/react-query';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/10 text-success',
  waitlist: 'bg-warning/10 text-warning',
  flex: 'bg-primary/10 text-primary',
};

function MemberRow({ member, onRemove }: { member: any; onRemove: (id: string) => void }) {
  const profile = member.profiles;
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{profile?.full_name ?? profile?.email ?? 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[member.status] ?? 'bg-muted text-muted-foreground'}`}>
          {member.status}
        </span>
        <button
          onClick={() => onRemove(member.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SessionRow({ session, onTap }: { session: any; onTap: () => void }) {
  const date = new Date(session.session_date + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const isPast = date < new Date();

  return (
    <button
      onClick={onTap}
      className="flex w-full items-center justify-between py-3 border-b border-border last:border-0 text-left active:bg-secondary/50 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{dateStr}</p>
        <p className="text-xs text-muted-foreground">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          session.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
          isPast ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success'
        }`}>
          {session.status === 'cancelled' ? 'Cancelled' : isPast ? 'Past' : 'Upcoming'}
        </span>
      </div>
    </button>
  );
}

function AddSessionModal({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: group } = useGroup(groupId);
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && group) {
      setStartTime(group.start_time?.slice(0, 5) ?? '');
      setEndTime(group.end_time?.slice(0, 5) ?? '');
    }
  }, [open, group]);

  async function handleSave() {
    if (!date || !startTime || !endTime) { toast.error('Please fill all fields'); return; }
    setSaving(true);
    try {
      const sessionDate = format(date, 'yyyy-MM-dd');
      // Insert session
      const { data: session, error: sErr } = await supabase
        .from('sessions')
        .insert({ group_id: groupId, session_date: sessionDate, start_time: startTime + ':00', end_time: endTime + ':00', status: 'scheduled' })
        .select()
        .single();
      if (sErr) throw sErr;

      // Create confirmations for active members
      const { data: members } = await supabase
        .from('group_members')
        .select('player_id')
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (members && members.length > 0) {
        await supabase.from('confirmations').insert(
          members.map(m => ({ session_id: session.id, player_id: m.player_id, status: 'pending' }))
        );
      }

      qc.invalidateQueries({ queryKey: ['group-sessions', groupId] });
      toast.success('Session added!');
      onClose();
    } catch {
      toast.error('Failed to add session');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add One-Off Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Date</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" disabled={d => d < new Date(new Date().setHours(0,0,0,0))} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Start time</p>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">End time</p>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Adding…' : 'Add Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChatTab({ groupId }: { groupId: string }) {
  const { user, profile } = useAuth();
  const { data: messages = [], isLoading } = useGroupMessages(groupId);
  const sendMessage = useSendGroupMessage(groupId);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText('');
    try {
      await sendMessage.mutateAsync({ content: trimmed, senderId: user.id });
    } catch {
      toast.error('Failed to send message');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground pt-8">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-2 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-foreground text-sm">No messages yet</p>
            <p className="text-xs text-muted-foreground">Say hi to your group!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = isMe ? 'You' : (msg.profiles?.full_name ?? 'Member');
            const initials = (msg.profiles?.full_name ?? 'M').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            const time = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </div>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && <p className="text-[10px] text-muted-foreground px-1">{senderName}</p>}
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">{time}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border px-4 py-3 flex gap-2 bg-card">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Message your group…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: group, isLoading } = useGroup(id);
  const { data: members = [] } = useGroupMembers(id);
  const { data: sessions = [] } = useGroupSessions(id);
  const removeMember = useRemoveMember(id!);
  const [showPast, setShowPast] = useState(false);
  const [addSessionOpen, setAddSessionOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const upcomingSessions = sessions.filter((s: any) => s.session_date >= today);
  const pastSessions = sessions.filter((s: any) => s.session_date < today).slice(0, 28);

  const inviteLink = group ? `${window.location.origin}/join/${group.invite_code}` : '';
  const activeCount = members.filter((m: any) => m.status === 'active').length;
  const waitlistCount = members.filter((m: any) => m.status === 'waitlist').length;

  async function handleRemove(memberId: string) {
    try {
      await removeMember.mutateAsync(memberId);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <p className="text-foreground font-medium">Group not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">{group.name}</h1>
          <p className="text-xs text-muted-foreground">{group.sport} · {DAYS[group.day_of_week]} · {group.start_time?.slice(0, 5)}</p>
        </div>
        <button
          onClick={() => navigate(`/coach/group/${id}/settings`)}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 pb-24 flex flex-col">
        <Tabs defaultValue="invite" className="flex flex-col flex-1">
          <div className="sticky top-[65px] z-10 bg-card border-b border-border px-4">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
              {[
                { value: 'invite', label: 'Invite', icon: Share2 },
                { value: 'members', label: 'Members', icon: Users },
                { value: 'sessions', label: 'Sessions', icon: Calendar },
                { value: 'chat', label: 'Chat', icon: MessageCircle },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex-1 flex items-center gap-1.5 rounded-none border-b-2 border-transparent py-3 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Invite Tab */}
          <TabsContent value="invite" className="mt-0 flex-1 px-4 py-6 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 card-shadow">
              <p className="text-xs text-muted-foreground mb-2">Share this link to invite players — no code needed</p>
              <p className="text-xs font-mono text-foreground break-all">{inviteLink}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!'); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground min-h-[48px]"
              >
                <Copy className="h-4 w-4" />
                Copy Invite Link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join my ${group.name} group on Sessio! ${inviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] min-h-[48px]"
              >
                <span>💬</span>
                Share via WhatsApp
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Players tap the link to join instantly
            </p>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-0 flex-1 px-4 py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              {activeCount} active · {waitlistCount} on waitlist
            </p>
            {members.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center card-shadow">
                <p className="text-2xl mb-2">👥</p>
                <p className="font-medium text-foreground">No members yet</p>
                <p className="text-sm text-muted-foreground mt-1">Share the invite link to add players</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 card-shadow">
                {members.map((m: any) => (
                  <MemberRow key={m.id} member={m} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-0 flex-1 px-4 py-4 space-y-4">
            <button
              onClick={() => setAddSessionOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              Add One-Off Session
            </button>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming ({upcomingSessions.length})</h3>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions — sessions auto-generate weekly</p>
              ) : (
                <div className="rounded-xl border border-border bg-card px-4 card-shadow">
                  {upcomingSessions.map((s: any) => (
                    <SessionRow key={s.id} session={s} onTap={() => navigate(`/coach/session/${s.id}`)} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setShowPast(v => !v)}
                className="flex w-full items-center justify-between text-sm font-semibold text-foreground py-2"
              >
                <span>Past sessions ({pastSessions.length})</span>
                {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showPast && pastSessions.length > 0 && (
                <div className="rounded-xl border border-border bg-card px-4 card-shadow mt-2">
                  {pastSessions.map((s: any) => (
                    <SessionRow key={s.id} session={s} onTap={() => navigate(`/coach/session/${s.id}`)} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-0 flex-1 flex flex-col" style={{ minHeight: 0 }}>
            <ChatTab groupId={id!} />
          </TabsContent>
        </Tabs>
      </div>

      <AddSessionModal groupId={id!} open={addSessionOpen} onClose={() => setAddSessionOpen(false)} />
      <CoachBottomNav />
    </div>
  );
}
