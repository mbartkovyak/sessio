import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import ChatList from '@/components/shared/ChatList';
import { useAllTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { useMyDMConversations } from '@/hooks/shared/useDirectMessages';
import Avatar from '@/components/shared/Avatar';
import { formatDistanceToNow } from 'date-fns';

export default function CoachMessages() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: myTrainings = [], isLoading } = useAllTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);
  const { data: dmConversations = [] } = useMyDMConversations();

  const allTrainings = useMemo(() => {
    if (!isSchoolOwner) return myTrainings;
    const ids = new Set(myTrainings.map((t: any) => t.id));
    return [...myTrainings, ...schoolTrainings.filter((t: any) => !ids.has(t.id))];
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Chats</h1>
        </div>
      </header>
      <div className="flex-1 pb-24">
        <div className="max-w-md mx-auto">
          {/* Direct messages */}
          {dmConversations.length > 0 && (
            <div className="divide-y divide-border">
              {dmConversations.map((c: any) => (
                <button
                  key={c.userId}
                  onClick={() => navigate(`/coach/dm/${c.userId}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <Avatar url={c.profile?.avatar_url} name={c.profile?.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">{c.profile?.full_name ?? 'Unknown'}</p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(c.lastAt), { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Group chats (training-based) */}
          <ChatList
            trainings={allTrainings}
            isLoading={isLoading}
            getChatPath={id => `/coach/trainings/${id}?tab=chat`}
            emptyText="Create a lesson and invite athletes to start chatting"
          />
        </div>
      </div>
      <CoachBottomNav />
    </div>
  );
}
