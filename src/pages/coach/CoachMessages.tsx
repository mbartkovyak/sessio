import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import ChatList from '@/components/shared/ChatList';
import { useMyConversations, type ConversationInfo } from '@/hooks/shared/useConversations';

export default function CoachMessages() {
  const { data: conversations = [], isLoading } = useMyConversations();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title="Chats" />
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="rounded-2xl bg-white shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <ChatList
              conversations={conversations}
              isLoading={isLoading}
              getChatPath={(conv: ConversationInfo) =>
                conv.type === 'dm' ? `/coach/dm/${conv.otherUserId}` : `/coach/trainings/${conv.trainingId}?tab=chat`
              }
              emptyText="Create a lesson and invite athletes to start chatting"
            />
          </div>
        </div>
      </div>
      <CoachBottomNav />
    </div>
  );
}
