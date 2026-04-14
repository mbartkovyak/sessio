import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const REASONS = ['spam', 'harassment', 'inappropriate', 'other'] as const;

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  contentType: 'message' | 'review';
  contentId: string;
  flaggedUserId: string;
}

export default function ReportDialog({ open, onClose, contentType, contentId, flaggedUserId }: ReportDialogProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [reason, setReason] = useState<typeof REASONS[number]>('spam');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('content_flags').insert({
      reporter_id: user.id,
      flagged_user_id: flaggedUserId,
      content_type: contentType,
      content_id: contentId,
      reason,
    });
    setSubmitting(false);

    if (error) {
      // Dedupe constraint — user already reported this
      if (error.code === '23505') {
        toast.info(t('chat.reportSubmitted'));
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(t('chat.reportSubmitted'));
    }
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('chat.reportTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('chat.reportDescription')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          {REASONS.map(r => (
            <label key={r} className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-secondary transition-colors">
              <input
                type="radio"
                name="reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-primary h-4 w-4"
              />
              <span className="text-sm text-foreground">{t(`chat.reportReasons.${r}`)}</span>
            </label>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t('chat.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
            {t('chat.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
