import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, SmilePlus } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingMessages, useSendTrainingMessage } from '@/hooks/training/useTrainingMessages';
import { markConversationSeen } from '@/hooks/shared/useUnreadMessageCount';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

const QUICK_EMOJIS = ['👍', '🎾', '💪', '🔥', '😊', '👋', '✅', '❌', '😂', '🙏'];

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

function formatDateSeparator(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary overflow-hidden self-end">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

export default function PlayerChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: training } = useTrainingName(id);
  const { data: messages = [] } = useTrainingMessages(id);
  const send = useSendTrainingMessage(id!);
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track if user scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScroll.current = atBottom;
  }, []);

  // Auto-scroll only when at bottom or new own message
  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  useEffect(() => { if (id) markConversationSeen(id); }, [id]);

  function handleSend() {
    if (!text.trim() || !user) return;
    send.mutate({ content: text.trim(), senderId: user.id });
    setText('');
    setShowEmojis(false);
    shouldAutoScroll.current = true;
  }

  function insertEmoji(emoji: string) {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  }

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg: any) => {
    const date = msg.created_at?.split('T')[0] ?? '';
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-3 py-3">
          <button
            onClick={() => navigate('/player/messages')}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate text-[15px]">{training?.name ?? 'Chat'}</h1>
            <p className="text-xs text-muted-foreground">{training?.sport} · Group chat</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="max-w-lg mx-auto px-3 py-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="font-semibold text-foreground">Start the conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Messages are shared with everyone in this training group
              </p>
            </div>
          )}

          {groupedMessages.map(group => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              <div className="space-y-[3px]">
                {group.msgs.map((msg: any, i: number) => {
                  const isMe = msg.sender_id === user?.id;
                  const sender = msg.profiles;
                  const prevMsg = group.msgs[i - 1];
                  const nextMsg = group.msgs[i + 1];
                  const sameSenderPrev = prevMsg?.sender_id === msg.sender_id;
                  const sameSenderNext = nextMsg?.sender_id === msg.sender_id;
                  const showName = !isMe && !sameSenderPrev;
                  const showAvatar = !isMe && !sameSenderNext;
                  const showTime = !sameSenderNext ||
                    (nextMsg && new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000);

                  // Bubble corner rounding: connected bubbles share flat edges
                  const myCorners = sameSenderPrev && sameSenderNext
                    ? 'rounded-2xl rounded-r-md'
                    : sameSenderPrev
                    ? 'rounded-2xl rounded-tr-md'
                    : sameSenderNext
                    ? 'rounded-2xl rounded-br-md'
                    : 'rounded-2xl';

                  const theirCorners = sameSenderPrev && sameSenderNext
                    ? 'rounded-2xl rounded-l-md'
                    : sameSenderPrev
                    ? 'rounded-2xl rounded-tl-md'
                    : sameSenderNext
                    ? 'rounded-2xl rounded-bl-md'
                    : 'rounded-2xl';

                  return (
                    <div key={msg.id}>
                      {showName && (
                        <p className="text-[11px] font-medium text-muted-foreground ml-11 mb-0.5 mt-2">
                          {sender?.full_name ?? 'Member'}
                        </p>
                      )}
                      <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar placeholder for alignment */}
                        {!isMe && (
                          showAvatar
                            ? <Avatar url={sender?.avatar_url} name={sender?.full_name ?? ''} />
                            : <div className="w-8 shrink-0" />
                        )}

                        <div className={`max-w-[78%] ${isMe ? 'order-first' : ''}`}>
                          <div className={`px-3 py-[7px] text-[15px] leading-snug break-words ${
                            isMe
                              ? `bg-primary text-primary-foreground ${myCorners} ${msg._optimistic ? 'opacity-60' : ''}`
                              : `bg-secondary text-secondary-foreground ${theirCorners}`
                          }`}>
                            {msg.content}
                          </div>
                          {showTime && (
                            <p className={`text-[10px] text-muted-foreground/60 mt-0.5 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                              {formatTime(msg.created_at)}
                              {isMe && !msg._optimistic && <span className="ml-1">✓</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emoji bar */}
      {showEmojis && (
        <div className="shrink-0 border-t border-border bg-card px-2 py-2">
          <div className="max-w-lg mx-auto flex gap-1 justify-center">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-secondary active:scale-90 transition-transform text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-end gap-2">
          <button
            onClick={() => setShowEmojis(prev => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors shrink-0 ${
              showEmojis ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <SmilePlus className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
              }, 300);
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/50 overflow-hidden min-h-[40px]"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30 active:scale-90 transition-all shrink-0"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
