import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AccountActions() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={async () => { await signOut(); navigate('/auth'); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-destructive"
        style={{ border: '1px solid rgba(0,0,0,0.2)' }}
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
      <button
        onClick={async () => {
          if (!confirm('Delete all your data? This cannot be undone.')) return;
          setDeleting(true);
          const { error } = await supabase.rpc('delete_my_account');
          if (error) { toast.error(error.message); setDeleting(false); return; }
          await signOut();
          navigate('/auth');
        }}
        disabled={deleting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-medium text-destructive disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete Account'}
      </button>
    </div>
  );
}
