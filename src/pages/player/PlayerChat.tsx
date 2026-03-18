import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, SmilePlus } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
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

function formatDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary overflow-hidden">
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
  const userScrolled = useRef(false);
  const prevMsgCount = useRef(0);

  // Scroll to bottom on mount and when new messages arrive (unless user scrolled up)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;

    if (!userScrolled.current || isNewMessage) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Detect user scrolling away from bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolled.current = distFromBottom > 100;
  }, []);

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
    userScrolled.current = false;
  }

  function insertEmoji(emoji: string) {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  }

  // Group messages by date
  const grouped: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg: any) => {
    const date = msg.created_at?.split('T')[0] ?? '';
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date, msgs: [msg] });
    }
  });

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

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-y-contain"
      >
        {/* min-h-full + justify-end = messages stick to bottom like Telegram */}
        <div className="max-w-lg mx-auto px-3 flex flex-col justify-end min-h-full">

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-8 py-20">
              <span className="text-4xl mb-3">💬</span>
              <p className="font-semibold text-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to say something</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(group => (
                <div key={group.date}>
                  {/* Date pill */}
                  <div className="flex justify-center py-2 sticky top-0 z-[1]">
                    <span className="rounded-full bg-foreground/[0.06] backdrop-blur-sm px-3 py-[3px] text-[11px] font-medium text-muted-foreground">
                      {formatDateLabel(group.date)}
                    </span>
                  </div>

                  {group.msgs.map((msg: any, i: number) => {
                    const isMe = msg.sender_id === user?.id;
                    const sender = msg.profiles;
                    const prev = group.msgs[i - 1];
                    const next = group.msgs[i + 1];
                    const samePrev = prev?.sender_id === msg.sender_id;
                    const sameNext = next?.sender_id === msg.sender_id;
                    const showName = !isMe && !samePrev;
                    const showAvatar = !isMe && !sameNext;
                    const timeDelta = next ? new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() : Infinity;
                    const showTime = !sameNext || timeDelta > 5 * 60 * 1000;

                    // Adaptive corner radii for connected bubbles
                    const r = 18; // base radius
                    const s = 4;  // small radius for connected edge
                    const borderRadius = isMe
                      ? `${samePrev ? s : r}px ${samePrev ? s : r}px ${sameNext ? s : r}px ${sameNext ? s : r}px`
                      : `${samePrev ? s : r}px ${samePrev ? s : r}px ${sameNext ? s : r}px ${sameNext ? s : r}px`;

                    const myRadius = {
                      borderTopLeftRadius: r,
                      borderTopRightRadius: samePrev ? s : r,
                      borderBottomRightRadius: sameNext ? s : r,
                      borderBottomLeftRadius: r,
                    };
                    const theirRadius = {
                      borderTopLeftRadius: samePrev ? s : r,
                      borderTopRightRadius: r,
                      borderBottomRightRadius: r,
                      borderBottomLeftRadius: sameNext ? s : r,
                    };

                    return (
                      <div key={msg.id} className={`${samePrev ? 'mt-[2px]' : 'mt-3'} ${!samePrev && i > 0 ? '' : ''}`}>
                        {showName && (
                          <p className="text-[11px] font-semibold text-primary/70 mb-[2px]" style={{ marginLeft: 35 }}>
                            {sender?.full_name ?? 'Member'}
                          </p>
                        )}
                        <div className={`flex items-end gap-[6px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar or spacer */}
                          {!isMe && (
                            showAvatar
                              ? <Avatar url={sender?.avatar_url} name={sender?.full_name ?? ''} />
                              : <div className="w-7 shrink-0" />
                          )}

                          <div className={`max-w-[75%] min-w-[48px]`}>
                            <div
                              style={isMe ? myRadius : theirRadius}
                              className={`px-3 py-[6px] text-[15px] leading-[1.35] break-words ${
                                isMe
                                  ? `bg-primary text-primary-foreground ${msg._optimistic ? 'opacity-50' : ''}`
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {msg.content}
                              {/* Inline time for short messages */}
                              {showTime && msg.content.length < 30 && (
                                <span className={`inline-block ml-2 align-bottom text-[10px] leading-none translate-y-[1px] ${
                                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                                }`}>
                                  {formatTime(msg.created_at)}
                                  {isMe && !msg._optimistic && ' ✓'}
                                </span>
                              )}
                            </div>
                            {/* Separate time for long messages */}
                            {showTime && msg.content.length >= 30 && (
                              <p className={`text-[10px] text-muted-foreground/50 mt-[2px] px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {formatTime(msg.created_at)}
                                {isMe && !msg._optimistic && ' ✓'}
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

      {/* ── Emoji tray ── */}
      {showEmojis && (
        <div className="shrink-0 border-t border-border bg-card px-2 py-1.5">
          <div className="max-w-lg mx-auto flex gap-0.5 justify-center">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary active:scale-90 transition-transform text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-2 py-1.5 flex items-end gap-1">
          <button
            onClick={() => setShowEmojis(prev => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors shrink-0 ${
              showEmojis ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <SmilePlus className="h-[22px] w-[22px]" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={() => {
              userScrolled.current = false;
              setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'smooth' });
              }, 350);
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-[20px] border border-input bg-background px-4 py-2 text-[15px] leading-snug focus:outline-none focus:border-primary/40 overflow-hidden min-h-[40px]"
          />
          {text.trim() ? (
            <button
              onClick={handleSend}
              disabled={send.isPending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-all shrink-0 disabled:opacity-50"
            >
              <Send className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <div className="w-10 shrink-0" /> // keeps layout stable when no send button
          )}
        </div>
      </div>
    </div>
  );
}
