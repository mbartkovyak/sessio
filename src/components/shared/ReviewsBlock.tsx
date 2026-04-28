import { useState } from 'react';
import { Star, X, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCanReviewCoach } from '@/hooks/school/useSchools';
import LeaveReviewSheet from '@/components/shared/LeaveReviewSheet';
import ReportDialog from '@/components/shared/ReportDialog';

export interface ReviewItem {
  id: string;
  rating: number;
  text: string | null;
  coach_response: string | null;
  reviewer_id: string;
  reviewer_name: string | null;
  coach_id: string;
  coach_name?: string | null;
  created_at: string;
}

interface Props {
  reviews: ReviewItem[];
  /** Coach context — enables "Leave a review" CTA for that coach. Pass null for school context. */
  coachId?: string | null;
  coachName?: string | null;
}

export default function ReviewsBlock({ reviews, coachId, coachName }: Props) {
  const { t } = useTranslation('player');
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [reportReview, setReportReview] = useState<{ id: string; reviewerId: string } | null>(null);

  const { data: canReview } = useCanReviewCoach(coachId ?? undefined);

  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : null;

  const showLeaveCta = !!coachId && !!coachName && !!canReview;

  if (count === 0 && !showLeaveCta) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{t('reviews.title')}</h3>
        {count > 0 && (
          <button onClick={() => setShowAll(true)} className="text-sm font-medium text-primary">
            {t('reviews.seeAll')}
          </button>
        )}
      </div>

      {count > 0 ? (
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
          {/* Aggregate rating card */}
          <div className="shrink-0 w-32 flex flex-col items-center justify-center rounded-2xl bg-secondary/40 p-4 text-center">
            <p className="text-3xl font-bold text-foreground leading-none">{avg!.toFixed(1)}</p>
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < Math.round(avg!) ? 'fill-warning text-warning' : 'text-muted'}`} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('reviews.ratingCount', { count })}</p>
          </div>

          {/* Review preview cards */}
          {reviews.slice(0, 6).map(r => (
            <div key={r.id} className="shrink-0 w-64 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                ))}
              </div>
              <p className="text-sm font-semibold text-foreground truncate">{r.reviewer_name ?? t('reviews.athlete')}</p>
              {r.coach_name && <p className="text-xs text-muted-foreground truncate">{t('reviews.aboutCoach', { name: r.coach_name })}</p>}
              {r.text && <p className="mt-1.5 text-sm text-foreground line-clamp-3">{r.text}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('reviews.empty')}</p>
      )}

      {showLeaveCta && (
        <button
          onClick={() => setShowLeave(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
        >
          <Star className="h-3.5 w-3.5" />
          {t('reviews.leaveCta')}
        </button>
      )}

      {showLeave && coachId && coachName && (
        <LeaveReviewSheet coachId={coachId} coachName={coachName} onClose={() => setShowLeave(false)} />
      )}

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAll(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md rounded-t-2xl bg-background p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowAll(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-1">{t('reviews.allTitle')}</h3>
            <div className="flex items-center gap-1 mb-4">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-semibold text-foreground">{avg!.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">{t('reviews.ratingCount', { count })}</span>
            </div>
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm text-foreground">{r.reviewer_name ?? t('reviews.athlete')}</span>
                      {r.coach_name && (
                        <p className="text-xs text-muted-foreground">{t('reviews.aboutCoach', { name: r.coach_name })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                        ))}
                      </div>
                      {user && r.reviewer_id !== user.id && (
                        <button
                          onClick={() => setReportReview({ id: r.id, reviewerId: r.reviewer_id })}
                          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                          title={t('coachProfile.reportReview')}
                        >
                          <Flag className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.text && <p className="text-sm text-muted-foreground">{r.text}</p>}
                  {r.coach_response && (
                    <div className="mt-2 pl-3 border-l-2 border-primary/30">
                      <p className="text-xs text-primary font-medium">{t('coachProfile.coachResponse')}</p>
                      <p className="text-xs text-muted-foreground">{r.coach_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <ReportDialog
              open={!!reportReview}
              onClose={() => setReportReview(null)}
              contentType="review"
              contentId={reportReview?.id ?? ''}
              flaggedUserId={reportReview?.reviewerId ?? ''}
            />
          </div>
        </div>
      )}
    </div>
  );
}
