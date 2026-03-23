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

export default function DirectChat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: otherProfile } = useProfile(userId);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="shrink-0 px-4 py-3" style={{
        background: 'linear-gradient(135deg, hsl(193 30% 44%) 0%, hsl(193 25% 52%) 100%)',
        borderBottom: '1px solid hsl(193 30% 40% / 0.3)',
      }}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar url={otherProfile?.avatar_url} name={otherProfile?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{otherProfile?.full_name ?? 'Chat'}</p>
            {otherProfile?.sport && <p className="text-xs text-white/60">{otherProfile.sport}</p>}
          </div>
        </div>
      </header>

      <ChatView otherUserId={userId} className="flex-1 min-h-0" />
    </div>
  );
}
