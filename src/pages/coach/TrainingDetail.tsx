import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Users, Settings, Clock, CalendarDays, Trash2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions, useUpdateTraining, useJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DAYS_SHORT, SPORT_ICONS } from '@/lib/constants';

import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import ChatView from '@/components/shared/ChatView';
import ProfileSheet from '@/components/shared/ProfileSheet';
import TrainingForm, { type TrainingFormValues } from '@/components/shared/TrainingForm';

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'chat' ? 'chat' : 'detail';
  const { data: training, isLoading, error: trainingError } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { user } = useAuth();
  const removeMember = useRemoveTrainingMember(id!);
  const { data: joinRequests = [] } = useJoinRequests(id);
  const respond = useRespondJoinRequest();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewProfile, setViewProfile] = useState<any>(null);

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

  async function handleDelete() {
    setDeleting(true);
    // Notify members via training chat before deleting
    if (members.length > 0 && user) {
      const { getOrCreateTrainingConversation } = await import('@/hooks/shared/useConversations');
      try {
        const convId = await getOrCreateTrainingConversation(training.id);
        await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: `⚠️ "${training.name}" has been cancelled and will no longer take place. Contact your coach for more information.`,
        });
      } catch {}
    }
    const { error } = await supabase
      .from('trainings')
      .update({ is_active: false })
      .eq('id', training.id);
    if (error) { toast.error(error.message); setDeleting(false); }
    else { toast.success('Training deleted — members notified'); navigate('/coach/trainings'); }
  }

  const isDeleted = !training.is_active;

  return (
    <div className={`flex flex-col bg-background ${activeTab === 'chat' && !showEdit ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      <header className="sticky top-0 z-10" style={{
        background: 'linear-gradient(135deg, hsl(193 30% 44%) 0%, hsl(193 25% 52%) 100%)',
        borderBottom: '1px solid hsl(193 30% 40% / 0.3)',
      }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white truncate">{training.name}</h1>
            <p className="text-xs text-white/60">
              {isDeleted ? 'Deleted' : `${training.sport} · ${daysLabel} · ${training.start_time?.slice(0,5)}`}
            </p>
          </div>
          {!isDeleted && (
            <button onClick={() => { setShowEdit(!showEdit); setSearchParams({}, { replace: true }); }} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 shrink-0">
              <Settings className="h-4.5 w-4.5 text-white/70" />
            </button>
          )}
        </div>
        {!showEdit && (
          <div className="max-w-md mx-auto px-4 pb-2 flex gap-1">
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'detail' ? 'bg-white/20 text-white' : 'text-white/50'}`}
            >
              Details
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'chat' }, { replace: true })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-white/20 text-white' : 'text-white/50'}`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
          </div>
        )}
      </header>

      {activeTab === 'chat' && !showEdit ? (
        <>
        <ChatView trainingId={training.id} className="flex-1 min-h-0" />
        </>
      ) : showEdit ? (
        <main className="flex-1 pb-24">
          <EditSection training={training} onClose={() => setShowEdit(false)} />
        </main>
      ) : (
        <main className="flex-1 pb-24">
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

            {isDeleted && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
                <p className="text-sm font-medium text-destructive">This training has been cancelled</p>
                <p className="text-xs text-muted-foreground mt-1">Chat is still available for members</p>
              </div>
            )}

            {!isDeleted && (
              <>
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

                {/* Join Requests */}
                {joinRequests.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-foreground text-sm mb-3">Join Requests <span className="text-muted-foreground font-normal">({joinRequests.length})</span></h2>
                    <div className="space-y-2">
                      {joinRequests.map((req: any) => {
                        const p = req.profiles;
                        return (
                          <div key={req.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                            <button onClick={() => setViewProfile(p)} className="flex items-center gap-3 mb-2.5 text-left w-full">
                              <Avatar url={p?.avatar_url} name={p?.full_name} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p?.full_name ?? p?.email ?? 'Unknown'}</p>
                              </div>
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => respond.mutate({ requestId: req.id, trainingId: training.id, userId: req.user_id, accept: true })}
                                className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => respond.mutate({ requestId: req.id, trainingId: training.id, userId: req.user_id, accept: false })}
                                className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-foreground text-sm">Members <span className="text-muted-foreground font-normal">({members.length})</span></h2>
                  </div>
                  {members.length === 0 && joinRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">No members yet — share the invite link</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                      {members.map((m: any) => {
                        const p = m.profiles;
                        return (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                            <button onClick={() => setViewProfile(p)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                              <Avatar url={p?.avatar_url} name={p?.full_name} size="sm" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p?.full_name ?? p?.email ?? 'Unknown'}</p>
                                {m.role === 'waitlist' && (
                                  <span className="text-xs text-warning font-medium">Waitlist</span>
                                )}
                              </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => navigate(`/coach/dm/${p?.id}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                                title="Direct message"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => { if (confirm(`Remove ${p?.full_name ?? 'this member'}?`)) removeMember.mutate(m.id); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
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

                {/* Delete */}
                <div className="space-y-2 border-t border-border pt-6">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px]"
                    >
                      <Trash2 className="h-4 w-4" /> Delete training
                    </button>
                  ) : (
                    <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
                      <p className="text-sm text-destructive text-center font-medium">Delete this training? All members will be notified.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border py-2.5 text-sm font-medium text-foreground min-h-[44px]">Cancel</button>
                        <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground min-h-[44px] disabled:opacity-60">
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </main>
      )}

      {(activeTab !== 'chat' || showEdit) && <CoachBottomNav />}
      {viewProfile && <ProfileSheet profile={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}

// ── Edit Section ──

function EditSection({ training, onClose }: { training: any; onClose: () => void }) {
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
      day_schedules: form.day_schedules || null,
    });
    toast.success('Training updated');
    onClose();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      <TrainingForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleSave}
        submitting={update.isPending}
        onCancel={onClose}
      />
    </div>
  );
}
