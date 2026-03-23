import { Send, Smile, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage, useTrainingConversation, useDMConversation, getOrCreateTrainingConversation, getOrCreateDMConversation, markConversationSeen } from '@/hooks/shared/useConversations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

import Avatar from '@/components/shared/Avatar';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// ── Hooks ──

function useMessageReactions(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['message-reactions', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const msgResult = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId!);
      const msgIds = (msgResult.data ?? []).map((m: any) => m.id);
      if (!msgIds.length) return {};
      const { data } = await supabase
        .from('message_reactions')
        .select('*, profiles:user_id(full_name)')
        .in('message_id', msgIds);
      const grouped: Record<string, any[]> = {};
      (data ?? []).forEach((r: any) => {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      });
      return grouped;
    },
  });
}

function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId: string }) => {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-reactions'] });
    },
  });
}

// ── Helpers ──

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👎'];

function formatDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}



// ── Reaction bar (appears on long-press) ──

function ReactionBar({ messageId, userId, onClose, reactions }: {
  messageId: string; userId: string; onClose: () => void; reactions: any[];
}) {
  const toggle = useToggleReaction();
  const myReactions = new Set(reactions.filter(r => r.user_id === userId).map(r => r.emoji));

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-0.5 rounded-full bg-card border border-border shadow-lg px-2 py-1">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => { toggle.mutate({ messageId, emoji, userId }); onClose(); }}
            className={`h-8 w-8 flex items-center justify-center rounded-full text-lg hover:bg-secondary active:scale-90 transition-transform ${
              myReactions.has(emoji) ? 'bg-primary/10' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inline reactions display ──

function ReactionsDisplay({ reactions, userId, messageId }: { reactions: any[]; userId: string; messageId: string }) {
  const toggle = useToggleReaction();
  if (!reactions?.length) return null;

  const counts: Record<string, { count: number; mine: boolean }> = {};
  reactions.forEach(r => {
    if (!counts[r.emoji]) counts[r.emoji] = { count: 0, mine: false };
    counts[r.emoji].count++;
    if (r.user_id === userId) counts[r.emoji].mine = true;
  });

  return (
    <div className="flex gap-1 mt-[2px] px-1 flex-wrap">
      {Object.entries(counts).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => toggle.mutate({ messageId, emoji, userId })}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[11px] transition-colors ${
            mine
              ? 'bg-primary/15 border border-primary/30'
              : 'bg-secondary/80 border border-transparent'
          }`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground font-medium">{count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Main component ──

interface ChatViewProps {
  trainingId?: string;
  otherUserId?: string;
  conversationId?: string;
  className?: string;
  style?: React.CSSProperties;
  hideBottomSafeArea?: boolean;
}

export default function ChatView({ trainingId, otherUserId, conversationId: directConvId, className, style, hideBottomSafeArea }: ChatViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Resolve conversation ID from either training or DM
  const { data: trainingConvId } = useTrainingConversation(trainingId);
  const { data: dmConvId } = useDMConversation(otherUserId);
  const conversationId = directConvId ?? trainingConvId ?? dmConvId ?? undefined;

  const { data: messages = [] } = useMessages(conversationId);
  const { data: allReactions = {} } = useMessageReactions(conversationId);
  const sendMutation = useSendMessage(conversationId);
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolled = useRef(false);
  const prevMsgCount = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to bottom on mount and new messages
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

  useEffect(() => { if (conversationId) markConversationSeen(conversationId); }, [conversationId]);

  async function handleSend() {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText('');
    setShowEmojis(false);
    userScrolled.current = false;

    // Create conversation if needed
    let convId = conversationId;
    if (!convId) {
      try {
        if (trainingId) {
          convId = await getOrCreateTrainingConversation(trainingId);
          qc.invalidateQueries({ queryKey: ['conversation-for-training', trainingId] });
        } else if (otherUserId) {
          convId = await getOrCreateDMConversation(user.id, otherUserId);
          qc.invalidateQueries({ queryKey: ['dm-conversation', user.id, otherUserId] });
        }
      } catch { toast.error('Failed to start conversation'); return; }
    }
    if (!convId) return;

    // Send using direct insert (since conversationId may have just been created)
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, content });
    if (error) toast.error('Failed to send');
    else qc.invalidateQueries({ queryKey: ['messages', convId] });
  }

  // Long-press handlers
  function onPointerDown(msgId: string) {
    longPressTimer.current = setTimeout(() => {
      setReactionMsgId(msgId);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }
  function onPointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  // Close reactions on tap outside
  function handleAreaClick() {
    if (reactionMsgId) setReactionMsgId(null);
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
    <div className={`flex flex-col ${className ?? ''}`} style={style}>
      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={handleAreaClick}
        className="flex-1 overflow-y-auto overscroll-y-contain"
      >
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
                    const msgReactions = allReactions[msg.id] ?? [];

                    const r = 18, s = 4;
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
                      <div key={msg.id} className={samePrev ? 'mt-[2px]' : 'mt-3'}>
                        {showName && (
                          <p className="text-[11px] font-semibold text-primary/70 mb-[2px]" style={{ marginLeft: 35 }}>
                            {sender?.full_name ?? 'Member'}
                          </p>
                        )}
                        <div className={`flex items-end gap-[6px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMe && (
                            showAvatar
                              ? <Avatar url={sender?.avatar_url} name={sender?.full_name} size="xs" />
                              : <div className="w-7 shrink-0" />
                          )}

                          <div className={`max-w-[75%] min-w-[48px] relative`}>
                            {/* Reaction bar on long-press */}
                            {reactionMsgId === msg.id && user && (
                              <ReactionBar
                                messageId={msg.id}
                                userId={user.id}
                                reactions={msgReactions}
                                onClose={() => setReactionMsgId(null)}
                              />
                            )}

                            <div
                              style={isMe ? myRadius : theirRadius}
                              className={`px-3 py-[6px] text-[15px] leading-[1.35] break-words select-none ${
                                isMe
                                  ? `bg-primary text-primary-foreground ${msg._optimistic ? 'opacity-50' : ''}`
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                              onPointerDown={() => onPointerDown(msg.id)}
                              onPointerUp={onPointerUp}
                              onPointerLeave={onPointerUp}
                              onContextMenu={e => { e.preventDefault(); setReactionMsgId(msg.id); }}
                            >
                              {msg.content}
                              {showTime && msg.content.length < 30 && (
                                <span className={`inline-block ml-2 align-bottom text-[10px] leading-none translate-y-[1px] ${
                                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                                }`}>
                                  {formatTime(msg.created_at)}
                                  {isMe && !msg._optimistic && ' ✓'}
                                </span>
                              )}
                            </div>

                            {showTime && msg.content.length >= 30 && (
                              <p className={`text-[10px] text-muted-foreground/50 mt-[2px] px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {formatTime(msg.created_at)}
                                {isMe && !msg._optimistic && ' ✓'}
                              </p>
                            )}

                            {/* Reactions display */}
                            {user && (
                              <ReactionsDisplay reactions={msgReactions} userId={user.id} messageId={msg.id} />
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

      {/* ── Emoji picker ── */}
      {showEmojis && (
        <div className="shrink-0 border-t border-border bg-card relative">
          <button
            onClick={() => setShowEmojis(false)}
            className="absolute top-2 right-2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <Picker
            data={data}
            onEmojiSelect={(e: any) => {
              setText(prev => prev + e.native);
              textareaRef.current?.focus();
            }}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={8}
          />
        </div>
      )}

      {/* ── Input bar ── */}
      <div className={`shrink-0 border-t border-border bg-card ${hideBottomSafeArea ? '' : 'pb-[env(safe-area-inset-bottom)]'}`}>
        <div className="max-w-lg mx-auto px-2 py-1.5 flex items-end gap-1">
          <button
            onClick={() => setShowEmojis(prev => !prev)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors shrink-0 ${
              showEmojis ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Smile className="h-[22px] w-[22px]" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={() => {
              setShowEmojis(false);
              userScrolled.current = false;
              setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'smooth' });
              }, 350);
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-[20px] border border-input bg-background px-4 py-2 text-[15px] leading-snug focus:outline-none focus:border-primary/40 overflow-hidden min-h-[40px]"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all shrink-0 active:scale-90 ${
              text.trim()
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
