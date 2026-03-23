import CoachBottomNav from '@/components/coach/CoachBottomNav';
import ChatList from '@/components/shared/ChatList';
import { useMyConversations, type ConversationInfo } from '@/hooks/shared/useConversations';

export default function CoachMessages() {
  const { data: conversations = [], isLoading } = useMyConversations();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-white">Chats</h1>
        </div>
      </header>
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: '1px solid hsl(203 20% 90%)' }}>
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
