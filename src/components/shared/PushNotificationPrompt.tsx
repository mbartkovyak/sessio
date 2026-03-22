import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/shared/usePushNotifications';
import { toast } from 'sonner';

export default function PushNotificationPrompt() {
  const { supported, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('_pushDismissed') === '1');
  const [loading, setLoading] = useState(false);

  // Don't show if: not supported, already granted, already dismissed
  if (!supported || permission === 'granted' || permission === 'denied' || dismissed) return null;

  async function handleEnable() {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) {
      toast.success('Notifications enabled!');
    } else {
      toast.error('Could not enable notifications');
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('_pushDismissed', '1');
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">Enable notifications</p>
        <p className="text-xs text-muted-foreground mt-0.5">Get reminders to confirm your trainings</p>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground min-h-[36px] disabled:opacity-60"
        >
          {loading ? 'Enabling...' : 'Turn on'}
        </button>
      </div>
      <button onClick={handleDismiss} className="shrink-0 p-1 rounded hover:bg-secondary">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
