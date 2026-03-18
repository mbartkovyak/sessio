import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingMessages, useSendTrainingMessage } from '@/hooks/training/useTrainingMessages';
import { markConversationSeen } from '@/hooks/shared/useUnreadMessageCount';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { user } = useAuth();
  const { data: training } = useTrainingName(id);
  const { data: messages = [] } = useTrainingMessages(id);
  const send = useSendTrainingMessage(id!);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [text]);
  useEffect(() => { if (id) markConversationSeen(id); }, [id]);

  function handleSend() {
    if (!text.trim() || !user) return;
    send.mutate({ content: text.trim(), senderId: user.id });
    setText('');
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="shrink-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/player/messages')} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{training?.name ?? 'Chat'}</h1>
            <p className="text-xs text-muted-foreground">{training?.sport}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 max-w-md mx-auto w-full px-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-foreground text-sm">No messages yet</p>
          </div>
        )}
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-xs text-muted-foreground px-1">{msg.profiles?.full_name ?? 'Member'}</span>}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${
                isMe
                  ? `bg-primary text-primary-foreground rounded-br-sm ${msg._optimistic ? 'opacity-70' : ''}`
                  : 'bg-secondary text-secondary-foreground rounded-bl-sm'
              }`}>{msg.content}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-card py-3 safe-area-bottom">
        <div className="max-w-md mx-auto px-4 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message your group..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
