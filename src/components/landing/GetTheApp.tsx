import { useEffect, useState } from 'react';
import { X, Apple, Smartphone, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_STORE_URL } from '@/lib/constants';
import { detectBrowserPlatform } from '@/lib/platform';

const ANDROID_CONTACT_EMAIL = 'mbartkovyak@gmail.com';

export default function GetTheApp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('auth');
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    if (open) setPlatform(detectBrowserPlatform());
  }, [open]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mailtoHref = buildMailto({
    to: ANDROID_CONTACT_EMAIL,
    subject: t('landing.getTheApp.androidMailSubject'),
    body: t('landing.getTheApp.androidMailBody'),
  });

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(ANDROID_CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can fail on older browsers / HTTP — no-op, user can still see the email.
    }
  }

  const showIOS = platform === 'ios' || platform === 'desktop';
  const showAndroid = platform === 'android' || platform === 'desktop';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-the-app-title"
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-[#111]/8 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('landing.getTheApp.close')}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#111]/60 hover:bg-[#111]/5 hover:text-[#111]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 py-8 md:px-10 md:py-10">
          <h2 id="get-the-app-title" className="mb-2 text-2xl font-bold tracking-tight text-[#111] md:text-[1.75rem]">
            {t('landing.getTheApp.title')}
          </h2>
          <p className="mb-8 text-sm text-[#111]/55 md:text-base">
            {t('landing.getTheApp.subtitle')}
          </p>

          <div className={`grid gap-5 ${showIOS && showAndroid ? 'md:grid-cols-2' : ''}`}>
            {showIOS && (
              <div className="rounded-2xl border border-[#111]/8 bg-[#fafaf7] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#111]">
                  <Apple className="h-5 w-5 fill-white text-white" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-[#111]">
                  {t('landing.getTheApp.iosHeading')}
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-[#111]/55">
                  {t('landing.getTheApp.iosBody')}
                </p>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#222] active:scale-[0.98] min-h-[44px]"
                >
                  {t('landing.getTheApp.iosButton')}
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </a>
              </div>
            )}

            {showAndroid && (
              <div className="rounded-2xl border border-[#111]/8 bg-[#fafaf7] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3ddc84]">
                  <Smartphone className="h-5 w-5 text-[#111]" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-[#111]">
                  {t('landing.getTheApp.androidHeading')}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-[#111]/55">
                  {t('landing.getTheApp.androidBody')}
                </p>

                <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#111]/10 bg-white px-3 py-2.5 text-sm text-[#111]/80">
                  <Mail className="h-4 w-4 flex-shrink-0 text-[#111]/40" />
                  <span className="truncate font-medium">{ANDROID_CONTACT_EMAIL}</span>
                  <button
                    type="button"
                    onClick={onCopy}
                    aria-label={t('landing.getTheApp.androidCopyButton')}
                    className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#111]/55 hover:bg-[#111]/5 hover:text-[#111]"
                  >
                    {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <a
                  href={mailtoHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(230,120,30,0.3)] transition-all hover:brightness-110 active:scale-[0.98] min-h-[44px]"
                >
                  <Mail className="h-4 w-4" />
                  {t('landing.getTheApp.androidEmailButton')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMailto({ to, subject, body }: { to: string; subject: string; body: string }) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`;
}
