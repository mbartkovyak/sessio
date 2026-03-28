import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { SPORT_ICONS } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import Avatar from './Avatar';
import { type ConversationInfo, markConversationSeen, markAsUnread, hideChat, isManuallyUnread } from '@/hooks/shared/useConversations';

interface Props {
  conversations: ConversationInfo[];
  isLoading: boolean;
  getChatPath: (conv: ConversationInfo) => string;
  emptyText?: string;
}

export default function ChatList({ conversations, isLoading, getChatPath, emptyText }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // useMyConversations already filters hidden from DB, but local hiddenIds
  // gives instant feedback after archiving (before query refetches)
  const visible = conversations.filter(c => !hiddenIds.includes(c.id));

  const cardStyle = { border: '1px solid hsl(203 20% 90%)' };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-4 space-y-1" style={cardStyle}>
        {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm" style={cardStyle}>
        <div className="flex flex-col items-center justify-center pt-20 pb-20 text-center px-6">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">{t('chat.noChats')}</p>
          <p className="text-sm text-muted-foreground mt-1">{emptyText ?? t('chat.startConversation')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={cardStyle}>
    <div className="divide-y divide-border" onClick={() => menuOpen && setMenuOpen(null)}>
      {visible.map(conv => {
        const isManual = isManuallyUnread(conv.id);
        const hasUnread = isManual || conv.unreadCount > 0;
        const icon = conv.type === 'training' ? (SPORT_ICONS[conv.sport ?? ''] ?? '🎯') : null;

        return (
          <div key={conv.id} className="relative flex items-center">
            <button
              onClick={() => {
                markConversationSeen(conv.id, qc, user?.id);
                navigate(getChatPath(conv));
              }}
              className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
            >
              {conv.type === 'dm' ? (
                <Avatar url={conv.avatarUrl} name={conv.name} size="md" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{conv.name}</p>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: getDateLocale() })}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {conv.lastMessage
                    ? `${conv.lastMessage.senderName ?? t('chat.someone')}: ${conv.lastMessage.content}`
                    : t('chat.noMessages')}
                </p>
              </div>
              {hasUnread && (
                !isManual && conv.unreadCount > 0 ? (
                  <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 shrink-0">
                    <span className="text-xs font-bold text-primary-foreground">{conv.unreadCount}</span>
                  </div>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                )
              )}
            </button>

            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id); }}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary mr-1"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {menuOpen === conv.id && (
              <div
                className="absolute right-12 top-2 z-20 rounded-xl border border-border bg-card shadow-lg py-1 min-w-[160px]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { markAsUnread(conv.id); qc.setQueryData(['unread-total', user?.id], (old: number | undefined) => (old ?? 0) + 1); setMenuOpen(null); }}
                  className="w-full px-4 py-2.5 text-sm text-left text-foreground hover:bg-secondary transition-colors"
                >
                  {t('chat.markAsUnread')}
                </button>
                {conv.type === 'dm' && (
                  <button
                    onClick={() => { if (!confirm(t('chat.archiveConfirm'))) return; hideChat(conv.id); setHiddenIds([...hiddenIds, conv.id]); setMenuOpen(null); }}
                    className="w-full px-4 py-2.5 text-sm text-left text-destructive hover:bg-secondary transition-colors"
                  >
                    {t('chat.archive')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}
