import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Count visits
    const visits = parseInt(localStorage.getItem('sessio_visits') ?? '0', 10) + 1;
    localStorage.setItem('sessio_visits', visits.toString());

    const dismissed = localStorage.getItem('sessio_install_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      if (visits >= 2) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setPrompt(null);
  }

  function dismiss() {
    setShowBanner(false);
    localStorage.setItem('sessio_install_dismissed', '1');
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-[72px] left-4 right-4 z-50 animate-fade-in">
      <div className="rounded-2xl bg-foreground px-4 py-3.5 card-shadow-md flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-background">Add Sessio to Home Screen</p>
          <p className="text-xs text-background/60">Works offline. No app store needed.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={dismiss} className="text-xs text-background/50 px-2 min-h-[36px]">
            Not now
          </button>
          <button onClick={handleInstall} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground min-h-[36px]">
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
