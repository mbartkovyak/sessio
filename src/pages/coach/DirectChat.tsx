import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Smile } from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages, useSendDirectMessage } from '@/hooks/shared/useDirectMessages';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import Avatar from '@/components/shared/Avatar';
import CoachBottomNav from '@/components/coach/CoachBottomNav';

function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, sport, city')
        .eq('id', userId!)
        .single();
      return data as any;
    },
  });
}

function formatDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

export default function DirectChat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: otherProfile } = useProfile(userId);
  const { data: messages = [] } = useDirectMessages(userId);
  const send = useSendDirectMessage(userId!);

  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolled = useRef(false);
  const prevMsgCount = useRef(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNew = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (!userScrolled.current || isNew) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolled.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  function handleSend() {
    if (!text.trim()) return;
    send.mutate({ content: text.trim() });
    setText('');
    userScrolled.current = false;
  }

  // Group messages by date
  const grouped: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg: any) => {
    const date = msg.created_at?.split('T')[0] ?? '';
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar url={otherProfile?.avatar_url} name={otherProfile?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{otherProfile?.full_name ?? 'Chat'}</p>
            {otherProfile?.sport && <p className="text-xs text-muted-foreground">{otherProfile.sport}</p>}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="max-w-md mx-auto px-3 flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-8 py-20">
              <span className="text-4xl mb-3">💬</span>
              <p className="font-semibold text-foreground text-sm">Start a conversation</p>
              <p className="text-xs text-muted-foreground mt-1">Send a message to {otherProfile?.full_name?.split(' ')[0] ?? 'them'}</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="flex justify-center py-2 sticky top-0 z-[1]">
                    <span className="rounded-full bg-foreground/[0.06] backdrop-blur-sm px-3 py-[3px] text-[11px] font-medium text-muted-foreground">
                      {formatDateLabel(group.date)}
                    </span>
                  </div>
                  {group.msgs.map((msg: any, i: number) => {
                    const isMe = msg.sender_id === user?.id;
                    const prev = group.msgs[i - 1];
                    const next = group.msgs[i + 1];
                    const samePrev = prev?.sender_id === msg.sender_id;
                    const sameNext = next?.sender_id === msg.sender_id;
                    const showTime = !sameNext;

                    const r = 18, s = 4;
                    const radius = isMe
                      ? { borderTopLeftRadius: r, borderTopRightRadius: samePrev ? s : r, borderBottomRightRadius: sameNext ? s : r, borderBottomLeftRadius: r }
                      : { borderTopLeftRadius: samePrev ? s : r, borderTopRightRadius: r, borderBottomRightRadius: r, borderBottomLeftRadius: sameNext ? s : r };

                    return (
                      <div key={msg.id} className={samePrev ? 'mt-[2px]' : 'mt-3'}>
                        <div className={`flex items-end gap-[6px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="max-w-[75%] min-w-[48px]">
                            <div
                              style={radius}
                              className={`px-3 py-[6px] text-[15px] leading-[1.35] break-words ${
                                isMe
                                  ? `bg-primary text-primary-foreground ${(msg as any)._optimistic ? 'opacity-50' : ''}`
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {msg.content}
                              {showTime && msg.content.length < 30 && (
                                <span className={`inline-block ml-2 align-bottom text-[10px] leading-none translate-y-[1px] ${
                                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                                }`}>
                                  {format(parseISO(msg.created_at), 'HH:mm')}
                                  {isMe && !(msg as any)._optimistic && ' ✓'}
                                </span>
                              )}
                            </div>
                            {showTime && msg.content.length >= 30 && (
                              <p className={`text-[10px] text-muted-foreground/50 mt-[2px] px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {format(parseISO(msg.created_at), 'HH:mm')}
                                {isMe && !(msg as any)._optimistic && ' ✓'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card">
        <div className="max-w-md mx-auto px-2 py-1.5 flex items-end gap-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={() => {
              userScrolled.current = false;
              setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'smooth' }), 350);
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-[20px] border border-input bg-background px-4 py-2 text-[15px] leading-snug focus:outline-none focus:border-primary/40 overflow-hidden min-h-[40px]"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all shrink-0 active:scale-90 ${
              text.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Nav spacer for inline layout */}
      <CoachBottomNav inline />
    </div>
  );
}
