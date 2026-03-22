import { useMemo } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import ChatList from '@/components/shared/ChatList';
import { useAllTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';

export default function CoachMessages() {
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: myTrainings = [], isLoading } = useAllTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);

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
