import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/shared/Avatar';
import ChatView from '@/components/shared/ChatView';
import AppHeader from '@/components/shared/AppHeader';

function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, sport')
        .eq('id', userId!)
        .single();
      return data as any;
    },
  });
}

export default function PlayerDirectChat() {
  const { userId } = useParams<{ userId: string }>();
  const { data: otherProfile } = useProfile(userId);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <AppHeader
        title={otherProfile?.full_name ?? 'Chat'}
        back
        inline
        right={<Avatar url={otherProfile?.avatar_url} name={otherProfile?.full_name} size="sm" />}
      />
      <ChatView otherUserId={userId} className="flex-1 min-h-0" />
    </div>
  );
}
