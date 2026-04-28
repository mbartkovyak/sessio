import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLeaveReview } from '@/hooks/school/useSchools';

interface Props {
  coachId: string;
  coachName: string;
  onClose: () => void;
}

export default function LeaveReviewSheet({ coachId, coachName, onClose }: Props) {
  const { t } = useTranslation('player');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const submit = useLeaveReview();

  async function handleSubmit() {
    if (rating < 1) return;
    try {
      await submit.mutateAsync({ coachId, rating, text: text.trim() || undefined });
      onClose();
    } catch {
      // toast handled in hook
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-card p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-bold text-foreground mb-1">{t('reviews.leaveTitle')}</h3>
        <p className="text-sm text-muted-foreground mb-5">{t('reviews.leaveDesc', { name: coachName })}</p>

        <div className="flex justify-center gap-1 mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 transition-transform active:scale-90"
              aria-label={`${n} stars`}
            >
              <Star
                className={`h-9 w-9 ${n <= rating ? 'fill-warning text-warning' : 'text-muted'}`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('reviews.textPlaceholder')}
          rows={4}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={rating < 1 || submit.isPending}
          className="mt-4 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
        >
          {submit.isPending ? t('reviews.submitting') : t('reviews.submit')}
        </button>
      </div>
    </div>
  );
}
