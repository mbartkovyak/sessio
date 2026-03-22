import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { markConversationSeen } from '@/hooks/shared/useUnreadMessageCount';
import { formatDistanceToNow } from 'date-fns';
import { SPORT_ICONS } from '@/lib/constants';
import { useLatestMessages, isUnread } from '@/hooks/shared/useLatestMessages';
import { useUnreadPerChat } from '@/hooks/shared/useUnreadPerChat';

function getHiddenChats(): string[] {
  try { return JSON.parse(localStorage.getItem('hidden_chats') ?? '[]'); } catch { return []; }
}
function hideChat(id: string) {
  const hidden = getHiddenChats();
  if (!hidden.includes(id)) localStorage.setItem('hidden_chats', JSON.stringify([...hidden, id]));
}
function markAsUnread(id: string) {
  const map = JSON.parse(localStorage.getItem('msg_last_seen') ?? '{}');
  delete map[id];
  localStorage.setItem('msg_last_seen', JSON.stringify(map));
}

interface Props {
  trainings: any[];
  isLoading: boolean;
  /** Path builder: given training id, return the chat URL */
  getChatPath: (trainingId: string) => string;
  emptyText?: string;
}

export default function ChatList({ trainings, isLoading, getChatPath, emptyText }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const trainingIds = trainings.map((t: any) => t.id);
  const { data: latestMessages = {} } = useLatestMessages(trainingIds);
  const { data: unreadCounts = {} } = useUnreadPerChat(trainingIds);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState(() => getHiddenChats());

  const visible = trainings.filter((t: any) => !hiddenIds.includes(t.id));

  const sorted = [...visible].sort((a: any, b: any) => {
    const ma = latestMessages[a.id];
    const mb = latestMessages[b.id];
    if (!ma && !mb) return 0;
    if (!ma) return 1;
    if (!mb) return -1;
    return mb.created_at.localeCompare(ma.created_at);
  });

  if (isLoading) {
    return (
      <div className="space-y-1 p-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center px-6">
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground">No chats yet</p>
        <p className="text-sm text-muted-foreground mt-1">{emptyText ?? 'Start a conversation'}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border" onClick={() => menuOpen && setMenuOpen(null)}>
      {sorted.map((t: any) => {
        const lastMsg = latestMessages[t.id];
        const unreadCount = unreadCounts[t.id] ?? 0;
        const hasUnread = unreadCount > 0 || isUnread(t.id, lastMsg, user!.id);
        return (
          <div key={t.id} className="relative flex items-center">
            <button
              onClick={() => {
                markConversationSeen(t.id);
                navigate(getChatPath(t.id));
              }}
              className="flex flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
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
              {hasUnread && (
                unreadCount > 0 ? (
                  <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 shrink-0">
                    <span className="text-[10px] font-bold text-primary-foreground">{unreadCount}</span>
                  </div>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                )
              )}
            </button>

            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === t.id ? null : t.id); }}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary mr-1"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {menuOpen === t.id && (
              <div
                className="absolute right-12 top-2 z-20 rounded-xl border border-border bg-card shadow-lg py-1 min-w-[160px]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { markAsUnread(t.id); setMenuOpen(null); window.location.reload(); }}
                  className="w-full px-4 py-2.5 text-sm text-left text-foreground hover:bg-secondary transition-colors"
                >
                  Mark as unread
                </button>
                <button
                  onClick={() => { hideChat(t.id); setHiddenIds(getHiddenChats()); setMenuOpen(null); }}
                  className="w-full px-4 py-2.5 text-sm text-left text-destructive hover:bg-secondary transition-colors"
                >
                  Delete chat
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
