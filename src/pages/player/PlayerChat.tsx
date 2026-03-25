import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ChatView from '@/components/shared/ChatView';
import AppHeader from '@/components/shared/AppHeader';

function useTrainingName(id: string | undefined) {
  return useQuery({
    queryKey: ['training-name', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('trainings')
        .select('name, sport')
        .eq('id', id!)
        .single();
      return data as any;
    },
  });
}

export default function PlayerChat() {
  const { id } = useParams<{ id: string }>();
  const { data: training } = useTrainingName(id);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <AppHeader
        title={training?.name ?? 'Chat'}
        subtitle={training?.sport ? `${training.sport} · Group` : undefined}
        back
        inline
      />
      {id && <ChatView trainingId={id} className="flex-1 min-h-0" />}
    </div>
  );
}
