import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Props {
  url: string;
  label?: string;
  className?: string;
}

/** Single share button. Uses native share sheet on mobile, copies link on desktop. Always shares the URL only. */
export default function ShareLinkButton({ url, label, className }: Props) {
  const { t } = useTranslation('common');
  const displayLabel = label ?? t('actions.shareLink');

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('actions.linkCopied'));
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
