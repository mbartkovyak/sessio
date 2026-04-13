import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function AccountActions() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={async () => { await signOut(); navigate('/auth'); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-destructive"
        style={{ border: '1px solid rgba(0,0,0,0.2)' }}
      >
        <LogOut className="h-4 w-4" /> {t('actions.signOut')}
      </button>
      <button
        onClick={async () => {
          if (!confirm(t('actions.confirmDelete'))) return;
          setDeleting(true);
          try {
            // Clean up storage files before deleting the account (direct SQL DELETE on storage.objects is blocked)
            for (const bucket of ['avatars', 'videos'] as const) {
              const { data: files } = await supabase.storage.from(bucket).list(user!.id);
              if (files?.length) {
                await supabase.storage.from(bucket).remove(files.map(f => `${user!.id}/${f.name}`));
              }
            }
            const { error } = await supabase.rpc('delete_my_account');
            if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); setDeleting(false); return; }
            await signOut();
            navigate('/auth');
          } catch (e) {
            console.error('delete_my_account failed:', e);
            toast.error(localizeErrorMessage(e, t('common:errors.somethingWentWrong')));
            setDeleting(false);
          }
        }}
        disabled={deleting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-medium text-destructive disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" /> {deleting ? t('actions.deleting') : t('actions.deleteAccount')}
      </button>
    </div>
  );
}
