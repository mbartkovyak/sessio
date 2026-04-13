import { Send, Smile, X, Flag } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useMessages, useTrainingConversation, useDMConversation, getOrCreateDMConversation, markConversationSeen, unhideChat } from '@/hooks/shared/useConversations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import i18n from '@/i18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import Avatar from '@/components/shared/Avatar';
import ReportDialog from '@/components/shared/ReportDialog';
import { SessioLoader } from '@/components/SessioLogo';

const EmojiPickerLazy = lazy(() =>
  Promise.all([
    import('@emoji-mart/data'),
    import('@emoji-mart/react'),
  ]).then(([dataModule, pickerModule]) => ({
    default: function EmojiPicker(props: { onEmojiSelect: (e: any) => void }) {
      const Picker = pickerModule.default;
      return (
        <Picker
          data={dataModule.default}
          onEmojiSelect={props.onEmojiSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={1}
          perLine={8}
        />
      );
    },
  }))
);

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
  if (isToday(date)) return i18n.t('calendar.today');
  if (isYesterday(date)) return i18n.t('calendar.yesterday');
  return format(date, 'EEE, d MMM', { locale: getDateLocale() });
}

function formatTime(dateStr: string) {
  return format(parseISO(dateStr), 'HH:mm');
}



// ── Reaction bar (appears on long-press) ──

function ReactionBar({ messageId, userId, onClose, reactions, onReport }: {
  messageId: string; userId: string; onClose: () => void; reactions: any[]; onReport?: () => void;
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
        {onReport && (
          <button
            onClick={() => { onReport(); onClose(); }}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all ml-0.5"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
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
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-xs transition-colors ${
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
}

export default function ChatView({ trainingId, otherUserId, conversationId: directConvId, className, style }: ChatViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Resolve conversation ID: local state > prop > hook results
  const { data: trainingConvId } = useTrainingConversation(trainingId);
  const { data: dmConvId } = useDMConversation(otherUserId);
  const [localConvId, setLocalConvId] = useState<string | null>(null);

  // Sync hook results into local state so we always have a stable ID
  const hookConvId = directConvId ?? trainingConvId ?? dmConvId ?? null;
  useEffect(() => {
    if (hookConvId && !localConvId) setLocalConvId(hookConvId);
  }, [hookConvId, localConvId]);

  const conversationId = localConvId ?? hookConvId ?? undefined;

  const { data: messages = [] } = useMessages(conversationId);
  const { data: allReactions = {} } = useMessageReactions(conversationId);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ msgId: string; senderId: string } | null>(null);
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

  // Ensure current user is a conversation participant.
  // Handles drop-in session attendees and edge cases where the DB trigger didn't fire.
  const ensuredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationId || !user || ensuredRef.current === conversationId) return;
    ensuredRef.current = conversationId;
    supabase
      .from('conversation_participants')
      .insert({ conversation_id: conversationId, user_id: user.id })
      .then(({ error }) => {
        // 23505 = already a participant — expected for most users
        if (!error) {
          // Just became a participant — refresh messages that were blocked by RLS
          qc.invalidateQueries({ queryKey: ['messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['my-conversations', user.id] });
        }
      });
  }, [conversationId, user?.id, qc]);

  useEffect(() => {
    if (conversationId) {
      markConversationSeen(conversationId, qc, user?.id);
    }
  }, [conversationId, qc, user?.id]);

  async function handleSend() {
    if (!text.trim() || !user || isSending) return;
    const content = text.trim();
    setText('');
    setShowEmojis(false);
    setIsSending(true);
    userScrolled.current = false;

    try {
      // Training conversations always exist (auto-created by DB trigger).
      // DMs: create on first message if needed.
      let convId = conversationId;
      if (!convId && otherUserId) {
        try {
          convId = await getOrCreateDMConversation(user.id, otherUserId);
        } catch (err: any) {
          toast.error(localizeErrorMessage(err, i18n.t('chat.failedCreate')));
          return;
        }
        setLocalConvId(convId);
        qc.invalidateQueries({ queryKey: ['dm-conversation', user.id, otherUserId] });
      }
      if (!convId) return;

      // Optimistic update: show message instantly
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId, conversation_id: convId, sender_id: user.id,
        content, created_at: new Date().toISOString(), profiles: null, _optimistic: true,
      };
      qc.setQueryData(['messages', convId], (old: any[]) => [...(old ?? []), optimisticMsg]);

      // Insert into DB
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, sender_id: user.id, content });

      if (error) {
        // Rollback optimistic message
        qc.setQueryData(['messages', convId], (old: any[]) => (old ?? []).filter(m => m.id !== tempId));
        toast.error(i18n.t('chat.failedSend'));
        return;
      }

      // Replace optimistic with real data + ensure chat is visible
      unhideChat(convId);
      qc.invalidateQueries({ queryKey: ['messages', convId] });
      qc.invalidateQueries({ queryKey: ['my-conversations'] });
    } catch (err: any) {
      toast.error(localizeErrorMessage(err, i18n.t('errors.somethingWentWrong')));
    } finally {
      setIsSending(false);
    }
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
  const grouped = useMemo(() => {
    const result: { date: string; msgs: any[] }[] = [];
    messages.forEach((msg: any) => {
      const date = msg.created_at?.split('T')[0] ?? '';
      const last = result[result.length - 1];
      if (last && last.date === date) last.msgs.push(msg);
      else result.push({ date, msgs: [msg] });
    });
    return result;
  }, [messages]);

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
              <p className="font-semibold text-foreground text-sm">{i18n.t('chat.noMessagesYet')}</p>
              <p className="text-xs text-muted-foreground mt-1">{i18n.t('chat.beFirst')}</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="flex justify-center py-2 sticky top-0 z-[1]">
                    <span className="rounded-full bg-foreground/[0.06] backdrop-blur-sm px-3 py-[3px] text-xs font-medium text-muted-foreground">
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
                          <p className="text-xs font-semibold text-primary/70 mb-[2px]" style={{ marginLeft: 35 }}>
                            {sender?.full_name ?? i18n.t('chat.member')}
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
                                onReport={!isMe ? () => setReportTarget({ msgId: msg.id, senderId: msg.sender_id }) : undefined}
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
                                <span className={`inline-block ml-2 align-bottom text-xs leading-none translate-y-[1px] ${
                                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                                }`}>
                                  {formatTime(msg.created_at)}
                                  {isMe && !msg._optimistic && ' ✓'}
                                </span>
                              )}
                            </div>

                            {showTime && msg.content.length >= 30 && (
                              <p className={`text-xs text-muted-foreground/50 mt-[2px] px-1 ${isMe ? 'text-right' : 'text-left'}`}>
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
          <Suspense fallback={<div className="h-[350px] flex items-center justify-center"><SessioLoader size={40} /></div>}>
            <EmojiPickerLazy onEmojiSelect={(e: any) => { setText(prev => prev + e.native); textareaRef.current?.focus(); }} />
          </Suspense>
        </div>
      )}

      {/* ── Floating input capsule ── */}
      <div className="shrink-0 px-4" style={{ paddingBottom: 'max(12px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 12px)))' }}>
        <div
          className="max-w-md mx-auto flex items-end gap-1 rounded-full px-2 py-1.5"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          <button
            tabIndex={-1}
            onClick={() => setShowEmojis(prev => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors shrink-0 ${
              showEmojis ? 'text-foreground' : 'text-foreground/40'
            }`}
          >
            <Smile className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            data-transparent
            enterKeyHint="send"
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
            placeholder={i18n.t('chat.messagePlaceholder')}
            rows={1}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-snug focus:outline-none overflow-hidden min-h-[36px]"
          />
          <button
            tabIndex={-1}
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0 active:scale-90 ${
              text.trim()
                ? 'bg-foreground text-white'
                : 'text-foreground/30'
            }`}
          >
            <Send className="h-[16px] w-[16px]" />
          </button>
        </div>
      </div>

      {/* ── Report dialog ── */}
      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType="message"
        contentId={reportTarget?.msgId ?? ''}
        flaggedUserId={reportTarget?.senderId ?? ''}
      />
    </div>
  );
}
