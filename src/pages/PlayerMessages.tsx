import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { usePlayerGroups } from '@/hooks/usePlayerGroups';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { formatDistanceToNow, parseISO, isToday, format } from 'date-fns';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

function lastMsgTime(ts: string) {
  const d = parseISO(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  return formatDistanceToNow(d, { addSuffix: false });
}

function GroupThread({ group }: { group: any }) {
  const navigate = useNavigate();
  const { data: messages = [] } = useGroupMessages(group.id);
  const last = messages[messages.length - 1];

  return (
    <button
      onClick={() => navigate(`/player/messages/${group.id}`)}
      className="flex items-center gap-3 w-full px-4 py-4 border-b border-border bg-card hover:bg-secondary/50 active:bg-secondary transition-colors text-left"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {SPORT_ICONS[group.sport] ?? '🎯'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-foreground truncate">{group.name}</p>
          {last?.created_at && (
            <span className="text-xs text-muted-foreground shrink-0">
              {lastMsgTime(last.created_at)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {last ? last.content : <span className="italic">No messages yet</span>}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function PlayerMessages() {
  const { data: groups = [], isLoading } = usePlayerGroups();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {isLoading ? (
            <div className="space-y-0">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-border">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">No groups yet</p>
              <p className="text-sm text-muted-foreground mt-1">Join a group to start chatting</p>
            </div>
          ) : (
            <div>
              {groups.map((g: any) => <GroupThread key={g.id} group={g} />)}
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
