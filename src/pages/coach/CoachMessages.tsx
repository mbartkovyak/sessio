import CoachBottomNav from '@/components/coach/CoachBottomNav';
import ChatList from '@/components/shared/ChatList';
import { useMyConversations, type ConversationInfo } from '@/hooks/shared/useConversations';

export default function CoachMessages() {
  const { data: conversations = [], isLoading } = useMyConversations();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 px-4 py-4" style={{
        background: 'linear-gradient(135deg, hsl(193 30% 44%) 0%, hsl(193 25% 52%) 100%)',
        borderBottom: '1px solid hsl(193 30% 40% / 0.3)',
      }}>
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-white">Chats</h1>
        </div>
      </header>
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
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
      <CoachBottomNav />
    </div>
  );
}
