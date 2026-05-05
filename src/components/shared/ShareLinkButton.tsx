import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Share } from '@capacitor/share';
import { isNative } from '@/lib/platform';

interface Props {
  url: string;
  label?: string;
  className?: string;
}

/** Single share button. Native uses the @capacitor/share plugin (iOS/Android share sheet);
 *  web mobile uses the Web Share API; desktop falls back to clipboard. Always URL only. */
export default function ShareLinkButton({ url, label, className }: Props) {
  const { t } = useTranslation('common');
  const displayLabel = label ?? t('actions.shareLink');

  async function handleShare() {
    // Native: opens the real iOS/Android share sheet. navigator.share alone
    // is unreliable in WKWebView/Android WebView, hence the plugin.
    if (isNative) {
      try {
        await Share.share({ url });
        return;
      } catch (e: unknown) {
        // iOS resolves "Share canceled" as a thrown error when the user
        // dismisses the sheet — that's not a failure, don't fall through.
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(msg)) return;
        // Genuine plugin failure — drop through to clipboard so the user
        // still gets the link.
      }
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      // Web mobile (Safari iOS, Chrome Android web) — Web Share API works.
      try {
        await navigator.share({ url });
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    // Fallback: clipboard. Desktop, or any case where the share sheet is unavailable.
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('actions.linkCopied'));
    } catch {
      toast.error(t('actions.linkCopyFailed', 'Could not share link'));
    }
  }

  return (
    <button
      onClick={handleShare}
      className={className ?? 'w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform'}
    >
      <Share2 className="h-4 w-4" /> {displayLabel}
    </button>
  );
}
