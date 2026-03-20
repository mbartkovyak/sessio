import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import OwnershipFilter, { type OwnershipTab } from '@/components/coach/OwnershipFilter';
import { markConversationSeen } from '@/hooks/shared/useUnreadMessageCount';
import { formatDistanceToNow } from 'date-fns';
import { SPORT_ICONS } from '@/lib/constants';
import { useLatestMessages, isUnread } from '@/hooks/shared/useLatestMessages';

export default function CoachMessages() {
  const { user } = useAuth();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const [ownershipTab, setOwnershipTab] = useState<OwnershipTab>('all');
  const hasSchoolTrainings = myTrainings.some((t: any) => t.school_id);
  const trainings = myTrainings.filter((t: any) =>
    ownershipTab === 'all' ? true : ownershipTab === 'personal' ? !t.school_id : !!t.school_id
  );
  const trainingIds = trainings.map((t: any) => t.id);
  const { data: latestMessages = {} } = useLatestMessages(trainingIds);
  const navigate = useNavigate();

  // Sort by latest message (most recent first), trainings without messages last
  const sorted = [...trainings].sort((a: any, b: any) => {
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
        <div className="max-w-md mx-auto space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Messages</h1>
          {hasSchoolTrainings && (
            <OwnershipFilter value={ownershipTab} onChange={setOwnershipTab} />
          )}
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{t.name}</p>
                        {ownershipTab === 'all' && hasSchoolTrainings && (
                          t.school_id
                            ? <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground shrink-0">{t.schools?.name ?? 'School'}</span>
                            : <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0">Personal</span>
                        )}
                      </div>
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
