import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Calendar, Settings, UserMinus, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useGroup } from '@/hooks/useGroups';
import { useGroupMembers, useRemoveMember } from '@/hooks/useGroupMembers';
import { useGroupSessions } from '@/hooks/useSessions';
import { useGenerateGroupSessions } from '@/hooks/useAutomation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CoachBottomNav from '@/components/CoachBottomNav';

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

function SessionRow({ session }: { session: any }) {
  const date = new Date(session.session_date + 'T00:00:00');
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const isPast = date < new Date();

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
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
  const generateSessions = useGenerateGroupSessions(id!);
  const [showPast, setShowPast] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const upcomingSessions = sessions.filter(s => s.session_date >= today).slice(0, 28);
  const pastSessions = sessions.filter(s => s.session_date < today).slice(0, 28);

  const inviteLink = group ? `${window.location.origin}/join/${group.invite_code}` : '';
  const activeCount = members.filter(m => m.status === 'active').length;
  const waitlistCount = members.filter(m => m.status === 'waitlist').length;

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
      {/* Header */}
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

      <div className="flex-1 pb-24">
        <Tabs defaultValue="invite" className="flex flex-col h-full">
          <div className="sticky top-[65px] z-10 bg-card border-b border-border px-4">
            <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
              {[
                { value: 'invite', label: 'Invite', icon: Share2 },
                { value: 'members', label: 'Members', icon: Users },
                { value: 'sessions', label: 'Sessions', icon: Calendar },
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
              <p className="text-xs text-muted-foreground mb-1">Invite code</p>
              <p className="font-mono text-2xl font-bold text-foreground tracking-widest">{group.invite_code}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 card-shadow">
              <p className="text-xs text-muted-foreground mb-2">Invite link</p>
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
              Players enter this code in the Sessio app to join your group
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
                {members.map(m => (
                  <MemberRow key={m.id} member={m} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-0 flex-1 px-4 py-4 space-y-4">
            <button
              onClick={() => generateSessions.mutate()}
              disabled={generateSessions.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary min-h-[44px] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${generateSessions.isPending ? 'animate-spin' : ''}`} />
              Generate Next Sessions
            </button>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming ({upcomingSessions.length})</h3>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              ) : (
                <div className="rounded-xl border border-border bg-card px-4 card-shadow">
                  {upcomingSessions.map(s => <SessionRow key={s.id} session={s} />)}
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
                  {pastSessions.map(s => <SessionRow key={s.id} session={s} />)}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CoachBottomNav />
    </div>
  );
}
