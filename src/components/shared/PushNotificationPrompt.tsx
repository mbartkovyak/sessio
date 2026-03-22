import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/shared/usePushNotifications';
import { toast } from 'sonner';

export default function PushNotificationPrompt() {
  const { supported, permission, subscribe, subscribed } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('_pushDismissed') === '1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debug: show state so we can see why it's hidden
  if (!supported || subscribed || permission === 'denied' || dismissed) {
    // Temporary: show debug info
    return (
      <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Push: supported={String(supported)} perm={permission} subscribed={String(subscribed)} dismissed={String(dismissed)}
      </div>
    );
  }

  async function handleEnable() {
    setLoading(true);
    setError('');
    const result = await subscribe();
    setLoading(false);
    if (result === true) {
      toast.success('Notifications enabled!');
    } else {
      setError(typeof result === 'string' ? result : 'Failed — make sure app is added to home screen');
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('_pushDismissed', '1');
  }

  const needsSubscription = permission === 'granted';

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">
          {needsSubscription ? 'Complete notification setup' : 'Enable notifications'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {needsSubscription ? 'Tap to finish — permission granted but setup incomplete' : 'Get reminders to confirm your trainings'}
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <button
          onClick={handleEnable}
          disabled={loading}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground min-h-[36px] disabled:opacity-60"
        >
          {loading ? 'Setting up...' : needsSubscription ? 'Complete setup' : 'Turn on'}
        </button>
      </div>
      {!needsSubscription && (
        <button onClick={handleDismiss} className="shrink-0 p-1 rounded hover:bg-secondary">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
