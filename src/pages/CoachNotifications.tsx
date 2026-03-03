import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check } from 'lucide-react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { toast } from 'sonner';

function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const TYPE_ICONS: Record<string, string> = {
  confirmation_request: '📋',
  spot_opened: '🔓',
  spot_claimed: '✅',
  session_cancelled: '❌',
  reminder: '⏰',
};

export default function CoachNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useNotifications();

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All marked as read');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-primary min-h-[44px] px-2">
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </header>

      <main className="flex-1 pb-24">
        {isLoading ? (
          <div className="flex justify-center pt-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">All clear!</p>
            <p className="text-sm text-muted-foreground mt-1">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n: any) => (
              <div key={n.id} className={`flex gap-3 px-4 py-4 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                <div className="mt-0.5 text-xl shrink-0">{TYPE_ICONS[n.type] ?? '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-foreground ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && <div className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
