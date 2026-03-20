import { useNavigate } from 'react-router-dom';
import { useMySchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { Users, Share2, Copy, UserPlus, ArrowLeft, Check, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import { useState } from 'react';

export default function SchoolCoaches() {
  const navigate = useNavigate();
  const { data: school, isLoading } = useMySchool();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const respond = useRespondSchoolMember();
  const [copied, setCopied] = useState(false);

  const coaches = (school)?.school_members ?? [];
  const pendingMembers = (school)?.pending_members ?? [];
  const isSelfCoach = coaches.some((m: any) => m.coach_id === profile?.id);
  const inviteCode = school?.invite_code;
  const inviteLink = inviteCode ? `${window.location.origin}/join-school/${inviteCode}` : '';
  const shareText = `Join ${school?.name} on Sessio as a coach!\n${inviteLink}`;

  async function addSelfAsCoach() {
    if (!school?.id || !profile?.id) return;
    const { error } = await supabase
      .from('school_members')
      .insert({ school_id: school.id, coach_id: profile.id, status: 'approved' });
    if (error) toast.error(error.message);
    else {
      toast.success("Added!");
      qc.invalidateQueries({ queryKey: ['my-school'] });
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${school?.name}`, text: shareText });
      } catch {}
    } else {
      handleCopy();
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/coach')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Coaches</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Invite section */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Invite a coach</h2>
          <p className="text-xs text-muted-foreground">Share this link — coaches request to join and you approve them.</p>

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground font-mono truncate">
              {inviteLink || 'Generating...'}
            </div>
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform"
          >
            <Share2 className="h-4 w-4" />
            Share invite link
          </button>
        </div>

        {/* Pending requests */}
        {pendingMembers.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground text-sm mb-3">
              Pending Requests ({pendingMembers.length})
            </h2>
            <div className="space-y-2">
              {pendingMembers.map((m: any) => {
                const coach = m.coach;
                return (
                  <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{coach?.full_name ?? 'Coach'}</p>
                        <p className="text-xs text-muted-foreground">{coach?.sport ?? ''}{coach?.city ? ` · ${coach.city}` : ''}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => respond.mutate({ memberId: m.id, accept: true })}
                        disabled={respond.isPending}
                        className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => respond.mutate({ memberId: m.id, accept: false })}
                        disabled={respond.isPending}
                        className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add self */}
        {!isSelfCoach && (
          <button
            onClick={addSelfAsCoach}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add myself as coach
          </button>
        )}

        {/* Coach list */}
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3">
            {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} in {school?.name}
          </h2>
          {coaches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No coaches yet — share the invite link to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coaches.map((m: any) => {
                const coach = m.coach;
                const isMe = m.coach_id === profile?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {coach?.full_name ?? 'Coach'}
                        {isMe && <span className="text-primary ml-1">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{coach?.sport ?? ''}{coach?.city ? ` · ${coach.city}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
