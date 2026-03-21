import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { markConversationSeen } from '@/hooks/shared/useUnreadMessageCount';
import { formatDistanceToNow } from 'date-fns';
import { SPORT_ICONS } from '@/lib/constants';
import { useLatestMessages, isUnread } from '@/hooks/shared/useLatestMessages';

export default function CoachMessages() {
  const { user } = useAuth();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const trainingIds = myTrainings.map((t: any) => t.id);
  const { data: latestMessages = {} } = useLatestMessages(trainingIds);
  const navigate = useNavigate();

  // Sort by latest message (most recent first), trainings without messages last
  const sorted = [...myTrainings].sort((a: any, b: any) => {
    const ma = latestMessages[a.id];
    const mb = latestMessages[b.id];
    if (!ma && !mb) return 0;
    if (!ma) return 1;
    if (!mb) return -1;
    return mb.created_at.localeCompare(ma.created_at);
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Messages</h1>
        </div>
      </header>

      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-6">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a lesson and invite athletes to start chatting</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((t: any) => {
              const lastMsg = latestMessages[t.id];
              const hasUnread = isUnread(t.id, lastMsg, user!.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    markConversationSeen(t.id);
                    navigate(`/coach/trainings/${t.id}?tab=chat`);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl shrink-0">
                    {SPORT_ICONS[t.sport] ?? '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{t.name}</p>
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {lastMsg
                        ? `${lastMsg.profiles?.full_name ?? 'Someone'}: ${lastMsg.content}`
                        : 'No messages yet'}
                    </p>
                  </div>
                  {hasUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <CoachBottomNav />
    </div>
  );
}
