import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import ChatList from '@/components/shared/ChatList';
import { useMyConversations, type ConversationInfo } from '@/hooks/shared/useConversations';
import { useTranslation } from 'react-i18next';

export default function CoachMessages() {
  const { data: conversations = [], isLoading } = useMyConversations();
  const { t } = useTranslation('coach');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('messages.title')} />
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          <ChatList
            conversations={conversations}
            isLoading={isLoading}
            getChatPath={(conv: ConversationInfo) =>
              conv.type === 'dm' ? `/coach/dm/${conv.otherUserId}` : `/coach/trainings/${conv.trainingId}?tab=chat`
            }
            emptyText={t('messages.emptyDesc')}
          />
        </div>
      </div>
      <CoachBottomNav />
    </div>
  );
}
