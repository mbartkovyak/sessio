import { X, Phone, MessageCircle, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from './Avatar';

interface Props {
  profile: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    email?: string | null;
    bio?: string | null;
    sport?: string | null;
    city?: string | null;
    role?: string | null;
  } | null;
  onClose: () => void;
}

export default function ProfileSheet({ profile, onClose }: Props) {
  const { t } = useTranslation('common');

  if (!profile) return null;

  const phone = profile.phone?.replace(/\s/g, '');
  const hasPhone = !!phone;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-card p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Avatar url={profile.avatar_url} name={profile.full_name} size="2xl" />
          <h2 className="mt-3 text-lg font-bold text-foreground">{profile.full_name ?? t('profile.unknown')}</h2>
          {(profile.sport || profile.city) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[profile.sport, profile.city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-muted-foreground text-center mb-5">{profile.bio}</p>
        )}

        {/* Contact actions */}
        <div className="space-y-2">
          {hasPhone && (
            <>
              <a
                href={`tel:${phone}`}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{profile.phone}</span>
                <span className="text-xs text-primary">{t('profile.call')}</span>
              </a>
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span className="flex-1">{t('profile.whatsapp')}</span>
                <span className="text-xs text-primary">{t('profile.open')}</span>
              </a>
            </>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
            >
              <span className="text-muted-foreground text-sm">@</span>
              <span className="flex-1 truncate">{profile.email}</span>
              <span className="text-xs text-primary">{t('profile.email')}</span>
            </a>
          )}
        </div>

        {!hasPhone && !profile.email && (
          <p className="text-sm text-muted-foreground text-center">{t('profile.noContact')}</p>
        )}
      </div>
    </div>
  );
}
