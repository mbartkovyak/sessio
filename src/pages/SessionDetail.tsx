import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Bell, Trash2, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession, useSessionConfirmations } from '@/hooks/useSessions';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed:  { label: 'Confirmed',  color: 'bg-success/10 text-success' },
  declined:   { label: 'Declined',   color: 'bg-destructive/10 text-destructive' },
  pending:    { label: 'Pending',    color: 'bg-muted text-muted-foreground' },
  no_response:{ label: 'No response',color: 'bg-muted text-muted-foreground' },
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isLoading } = useSession(id);
  const { data: confirmations = [] } = useSessionConfirmations(id);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const group = session?.groups as any;
  const date = session ? new Date(session.session_date + 'T00:00:00') : null;
  const dateStr = date?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  async function handleCancel() {
    if (!confirm('Cancel this session? Players will be notified.')) return;
    setCancelling(true);
    try {
      await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', id!);
      qc.invalidateQueries({ queryKey: ['session', id] });
      toast.success('Session cancelled');
    } catch {
      toast.error('Failed to cancel session');
    } finally {
      setCancelling(false);
    }
  }

  async function handleSaveNotes() {
    try {
      await supabase.from('sessions').update({ notes }).eq('id', id!);
      setEditingNotes(false);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">{group?.name}</h1>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
        {session.status === 'cancelled' && (
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">Cancelled</span>
        )}
      </header>

      <main className="flex-1 px-4 py-6 space-y-5 pb-10">
        {/* Session Info */}
        <div className="rounded-xl border border-border bg-card p-4 card-shadow space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {group?.location}
          </div>
        </div>

        {/* Attendance summary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Confirmed', count: confirmations.filter(c => c.status === 'confirmed').length, color: 'text-success' },
            { label: 'Declined',  count: confirmations.filter(c => c.status === 'declined').length,  color: 'text-destructive' },
            { label: 'Pending',   count: confirmations.filter(c => c.status === 'pending').length,   color: 'text-muted-foreground' },
            { label: 'Total',     count: confirmations.length, color: 'text-foreground' },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center card-shadow">
              <div className={`text-xl font-bold ${color}`}>{count}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Player Roster */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Player Roster</h2>
          {confirmations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center card-shadow">
              <p className="text-sm text-muted-foreground">No confirmation requests sent yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
              {confirmations.map((c: any) => {
                const profile = c.profiles;
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';
                const respondedAt = c.responded_at ? new Date(c.responded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;

                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{profile?.full_name ?? 'Unknown'}</p>
                        {respondedAt && (
                          <p className="text-xs text-muted-foreground">Responded {respondedAt}</p>
                        )}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Notes</h2>
            <button onClick={() => setEditingNotes(v => !v)} className="text-xs text-primary font-medium min-h-[44px] px-2">
              {editingNotes ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes || session.notes || ''}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add session notes..."
                rows={3}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={handleSaveNotes} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px]">
                Save Notes
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 card-shadow">
              <p className="text-sm text-muted-foreground">{session.notes || 'No notes yet. Tap Edit to add some.'}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {session.status !== 'cancelled' && (
          <div className="space-y-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive min-h-[44px]"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Cancel Session
              </div>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
