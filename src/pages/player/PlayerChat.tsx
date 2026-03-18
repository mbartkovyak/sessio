import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ChatView from '@/components/shared/ChatView';

function useTrainingName(id: string | undefined) {
  return useQuery({
    queryKey: ['training-name', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('trainings' as any)
        .select('name, sport')
        .eq('id', id!)
        .single();
      return data as any;
    },
  });
}

export default function PlayerChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: training } = useTrainingName(id);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="shrink-0 z-10 border-b border-border bg-card">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-3 h-14">
          <button
            onClick={() => navigate('/player/messages')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors shrink-0 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate text-[15px] leading-tight">{training?.name ?? 'Chat'}</h1>
            <p className="text-[12px] text-muted-foreground leading-tight">{training?.sport} · Group</p>
          </div>
        </div>
      </header>

      {id && <ChatView trainingId={id} className="flex-1" />}
    </div>
  );
}
