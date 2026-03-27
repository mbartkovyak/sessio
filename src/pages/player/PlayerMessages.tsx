import { useTranslation } from 'react-i18next';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import ChatList from '@/components/shared/ChatList';
import { useMyConversations, type ConversationInfo } from '@/hooks/shared/useConversations';

export default function PlayerMessages() {
  const { t } = useTranslation('player');
  const { data: conversations = [], isLoading } = useMyConversations();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={t('messages.title')} />
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          <ChatList
            conversations={conversations}
            isLoading={isLoading}
            getChatPath={(conv: ConversationInfo) =>
              conv.type === 'dm' ? `/player/dm/${conv.otherUserId}` : `/player/messages/${conv.trainingId}`
            }
            emptyText={t('messages.emptyDesc')}
          />
        </div>
      </div>
      <PlayerBottomNav />
    </div>
  );
}
