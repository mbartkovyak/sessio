import { supabase } from '@/integrations/supabase/client';

/**
 * Send push notification to specific users.
 * Fire-and-forget — errors are silently ignored so they never block the UI.
 * The edge function automatically excludes the calling user.
 */
export function notifyUsers(
  userIds: string[],
  payload: { title: string; body: string; tag?: string; url?: string },
) {
  if (!userIds.length) return;
  supabase.functions.invoke('send-push', {
    body: { action: 'notify', user_ids: userIds, ...payload },
  }).catch(() => {});
}

/**
 * Send push notification for a new message in a conversation.
 * The edge function looks up participants, their roles, and constructs
 * per-user deep link URLs (player vs coach paths).
 */
export function notifyMessage(conversationId: string, messagePreview: string) {
  supabase.functions.invoke('send-push', {
    body: { action: 'notify_message', conversation_id: conversationId, message_preview: messagePreview },
  }).catch(() => {});
}
