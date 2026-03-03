import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useGroups } from '@/hooks/useGroups';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { formatDistanceToNow, parseISO } from 'date-fns';

function GroupThread({ group }: { group: any }) {
  const navigate = useNavigate();
  const { data: messages = [] } = useGroupMessages(group.id);
  const last = messages[messages.length - 1];

  return (
    <button
      onClick={() => navigate(`/coach/messages/${group.id}`)}
      className="flex items-center gap-3 w-full px-4 py-4 border-b border-border bg-card hover:bg-secondary/50 active:bg-secondary transition-colors text-left"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {group.sport === 'Tennis' ? '🎾' : group.sport === 'Swimming' ? '🏊' : group.sport === 'Football' ? '⚽' : '🎯'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground truncate">{group.name}</p>
          {last?.created_at && (
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatDistanceToNow(parseISO(last.created_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {last ? last.content : 'No messages yet'}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function CoachMessages() {
  const { data: groups = [], isLoading } = useGroups();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
      </header>

      <main className="flex-1 pb-24">
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
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-semibold text-foreground">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a group to start chatting with your players</p>
          </div>
        ) : (
          <div>
            {groups.map((g: any) => <GroupThread key={g.id} group={g} />)}
          </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
