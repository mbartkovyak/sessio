import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '@/components/shared/Avatar';

export default function PendingApprovalScreen({ pendingRequest }: { pendingRequest: any }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pendingSchool = pendingRequest.schools as any;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <SessioLogoCompact />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Waiting for approval</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your request to join <span className="font-semibold text-foreground">{pendingSchool?.name}</span> is being reviewed by the school owner.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar url={pendingSchool?.logo_url} name={pendingSchool?.name} size="md" />
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">{pendingSchool?.name}</p>
                <p className="text-xs text-muted-foreground">{[pendingSchool?.sport, pendingSchool?.city].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">You'll get access once the owner approves your request.</p>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['my-pending-school-request'] })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px]"
          >
            Check status
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/auth'); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
