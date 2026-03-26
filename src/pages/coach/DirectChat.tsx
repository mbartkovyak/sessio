import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/shared/Avatar';
import ChatView from '@/components/shared/ChatView';
import CoachHeader from '@/components/coach/CoachHeader';

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

export default function DirectChat() {
  const { userId } = useParams<{ userId: string }>();
  const { data: otherProfile } = useProfile(userId);
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <CoachHeader
        title={otherProfile?.full_name ?? t('chat.chatTitle')}
        back
        inline
        right={<Avatar url={otherProfile?.avatar_url} name={otherProfile?.full_name} size="sm" />}
      />
      <ChatView otherUserId={userId} className="flex-1 min-h-0" />
    </div>
  );
}
