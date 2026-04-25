import { useEffect, useState } from 'react';
import { X, Mail, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_STORE_URL } from '@/lib/constants';
import { detectBrowserPlatform } from '@/lib/platform';

const ANDROID_CONTACT_EMAIL = 'mbartkovyak@gmail.com';

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function AndroidLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.342c-.553 0-1-.447-1-1s.447-1 1-1 1 .447 1 1-.447 1-1 1zm-11.046 0c-.553 0-1-.447-1-1s.447-1 1-1 1 .447 1 1-.447 1-1 1zm11.405-6.072 1.997-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.566.152l-2.022 3.503C15.591 8.176 13.846 7.83 12 7.83s-3.59.346-5.139.968L4.84 5.295a.413.413 0 0 0-.566-.152.416.416 0 0 0-.152.567l1.997 3.46C2.69 11.075.5 14.443.5 18.286h23c0-3.843-2.19-7.211-5.618-9.016z" />
    </svg>
  );
}

export default function GetTheApp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('auth');
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

  const showIOS = platform === 'ios' || platform === 'desktop';
  const showAndroid = platform === 'android' || platform === 'desktop';
  const showQR = platform === 'desktop';

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
              <div className="flex flex-col rounded-2xl border border-[#111]/8 bg-[#fafaf7] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#111]">
                  <AppleLogo className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-[#111]">
                  {t('landing.getTheApp.iosHeading')}
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-[#111]/55">
                  {t('landing.getTheApp.iosBody')}
                </p>

                {showQR && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#111]/8 bg-white p-3">
                    <img
                      src="/landing/app-store-qr.svg"
                      alt=""
                      aria-hidden="true"
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] flex-shrink-0 rounded-md"
                    />
                    <div className="text-xs leading-snug text-[#111]/60">
                      {t('landing.getTheApp.iosQrHint')}
                    </div>
                  </div>
                )}

                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#222] active:scale-[0.98] min-h-[44px]"
                >
                  {t('landing.getTheApp.iosButton')}
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </a>
              </div>
            )}

            {showAndroid && (
              <div className="flex flex-col rounded-2xl border border-[#111]/8 bg-[#fafaf7] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3ddc84]">
                  <AndroidLogo className="h-[22px] w-[22px] text-[#111]" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-[#111]">
                  {t('landing.getTheApp.androidHeading')}
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-[#111]/55">
                  {t('landing.getTheApp.androidBody')}
                </p>

                <a
                  href={mailtoHref}
                  className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(230,120,30,0.3)] transition-all hover:brightness-110 active:scale-[0.98] min-h-[44px]"
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
