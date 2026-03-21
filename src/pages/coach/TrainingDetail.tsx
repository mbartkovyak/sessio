import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Settings, Clock, CalendarDays, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions, useUpdateTraining } from '@/hooks/training/useTrainings';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DAYS_SHORT, SPORT_ICONS } from '@/lib/constants';

import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import TrainingForm, { type TrainingFormValues } from '@/components/shared/TrainingForm';

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: training, isLoading, error: trainingError } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const removeMember = useRemoveTrainingMember(id!);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const inviteLink = training ? `${window.location.origin}/join/${training.invite_code}` : '';
  const shareText = training ? `Join ${training.name} on Sessio!\n${inviteLink}` : '';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 px-6">
      <p className="text-muted-foreground">Training not found</p>
      {trainingError && <p className="text-xs text-destructive text-center max-w-sm">{(trainingError).message}</p>}
      <button onClick={() => navigate('/coach/trainings')} className="text-sm text-primary font-medium">Back to Trainings</button>
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter((s: any) => s.session_date >= today).slice(0, 5);
  const regularMembers = members.filter((m: any) => m.role === 'regular');
  const waitlistMembers = members.filter((m: any) => m.role === 'waitlist');
  const daysLabel = (training.days_of_week ?? [training.day_of_week]).map((d: number) => DAYS_SHORT[d]).filter(Boolean).join(', ');

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: training.name, text: shareText }); } catch {}
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copied!');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">{training.name}</h1>
            <p className="text-xs text-muted-foreground">{training.sport} · {daysLabel} · {training.start_time?.slice(0,5)}</p>
          </div>
          <button onClick={() => setShowEdit(!showEdit)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {showEdit ? (
          <EditSection training={training} onClose={() => setShowEdit(false)} onDelete={() => navigate('/coach/trainings')} />
        ) : (
          <div className="max-w-md mx-auto px-4 py-5 space-y-6">

            {/* Training info card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{SPORT_ICONS[training.sport] ?? '🎯'}</span>
                <div>
                  <p className="font-semibold text-foreground">{training.name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">{training.type}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> {daysLabel}</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /> {training.start_time?.slice(0,5)} – {training.end_time?.slice(0,5)}</div>
                {training.venue && <div className="flex items-center gap-2"><VenueLink venue={training.venue} className="text-sm text-muted-foreground" /></div>}
                {training.type === 'group' && <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0" /> {regularMembers.length}/{training.max_players ?? '∞'} athletes</div>}
              </div>
            </div>

            {/* Invite */}
            <div>
              <h2 className="font-semibold text-foreground text-sm mb-3">Invite Athletes</h2>
              <div className="flex gap-2">
                <button onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform">
                  <Share2 className="h-4 w-4" /> Share link
                </button>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-border hover:bg-secondary shrink-0">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 py-3 text-sm font-semibold text-[#25D366] min-h-[44px] mt-2">
                💬 WhatsApp
              </a>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Members <span className="text-muted-foreground font-normal">({members.length})</span></h2>
              </div>
              {members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No members yet — share the invite link</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {members.map((m: any) => {
                    const p = m.profiles;
                    return (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar url={p?.avatar_url} name={p?.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p?.full_name ?? p?.email ?? 'Unknown'}</p>
                            {m.role === 'waitlist' && (
                              <span className="text-xs text-warning font-medium">Waitlist</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => { if (confirm(`Remove ${p?.full_name ?? 'this member'}?`)) removeMember.mutate(m.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 shrink-0 ml-2"
                          title="Remove member"
                        >
                          <span className="text-destructive text-sm">✕</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming lessons */}
            <div>
              <h2 className="font-semibold text-foreground text-sm mb-3">Upcoming Lessons</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming lessons</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM')}</p>
                        <p className="text-xs text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}

// ── Edit Section ──

function EditSection({ training, onClose, onDelete }: { training: any; onClose: () => void; onDelete: () => void }) {
  const update = useUpdateTraining(training.id);

  const initialValues: Partial<TrainingFormValues> = training ? {
    name: training.name ?? '',
    type: training.type ?? 'group',
    sport: training.sport ?? 'Tennis',
    venue: training.venue ?? '',
    start_time: training.start_time?.slice(0, 5) ?? '09:00',
    end_time: training.end_time?.slice(0, 5) ?? '10:00',
    max_players: training.max_players ?? 6,
    is_recurring: training.is_recurring ?? true,
    days_of_week: training.days_of_week ?? [training.day_of_week ?? 0],
    start_date: training.start_date ?? '',
    end_date: training.end_date ?? '',
    booking_mode: training.booking_mode ?? 'instant',
    visibility: training.visibility ?? 'private',
    confirmation_window_hours: training.confirmation_window_hours ?? 48,
    no_response_behavior: training.no_response_behavior ?? 'mark_absent',
    day_schedules: training.day_schedules ?? null,
  } : undefined;

  async function handleSave(form: TrainingFormValues) {
    await update.mutateAsync({
      name: form.name, sport: form.sport, venue: form.venue,
      type: form.type,
      day_of_week: form.days_of_week[0], days_of_week: form.days_of_week,
      start_time: form.start_time + ':00', end_time: form.end_time + ':00',
      max_players: form.type === 'group' ? form.max_players : undefined,
      booking_mode: form.booking_mode, visibility: form.visibility,
      confirmation_window_hours: form.confirmation_window_hours,
      no_response_behavior: form.no_response_behavior,
      day_schedules: form.day_schedules || null,
    });
    toast.success('Training updated');
    onClose();
  }

  async function handleDelete() {
    const { error } = await supabase
      .from('trainings')
      .update({ is_active: false })
      .eq('id', training.id);
    if (error) toast.error(error.message);
    else { toast.success('Training deleted'); onDelete(); }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      <TrainingForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleSave}
        submitting={update.isPending}
        onCancel={onClose}
        onDelete={handleDelete}
      />
    </div>
  );
}
