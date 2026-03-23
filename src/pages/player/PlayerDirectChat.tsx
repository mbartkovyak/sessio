import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Avatar from '@/components/shared/Avatar';
import ChatView from '@/components/shared/ChatView';

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
  const navigate = useNavigate();
  const { data: otherProfile } = useProfile(userId);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="shrink-0 z-10 border-b border-border bg-card">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-3 h-14">
          <button
            onClick={() => navigate('/player/messages')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary shrink-0 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar url={otherProfile?.avatar_url} name={otherProfile?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{otherProfile?.full_name ?? 'Chat'}</p>
            {otherProfile?.sport && <p className="text-xs text-muted-foreground">{otherProfile.sport}</p>}
          </div>
        </div>
      </header>

      <ChatView otherUserId={userId} className="flex-1" />
    </div>
  );
}
