import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X, UserPlus, Users, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import Avatar from '@/components/shared/Avatar';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import { SessioLoader } from '@/components/SessioLogo';
import { useMySchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { sportLabel } from '@/lib/constants';

export default function SchoolCoaches() {
  const { t } = useTranslation('school');
  const { user } = useAuth();
  const { data: school, isLoading } = useMySchool();
  const respondSchool = useRespondSchoolMember();
  const [showInvite, setShowInvite] = useState(false);

  const coaches = school?.school_members ?? [];
  const pendingCoaches = school?.pending_members ?? [];
  const inviteCode = school?.invite_code;
  const inviteLink = inviteCode ? `${window.location.origin}/join-school/${inviteCode}` : '';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('dashboard.coachesSection')} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SessioLoader />
            </div>
          ) : (
            <>
              {/* Pending coach requests */}
              {pendingCoaches.length > 0 && (
                <section>
                  <p className="text-xs font-medium text-amber-600 mb-2">{t('dashboard.pendingRequests')} ({pendingCoaches.length})</p>
                  <div className="space-y-2">
                    {pendingCoaches.map((m: any) => {
                      const coach = m.coach;
                      return (
                        <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{coach?.full_name ?? t('dashboard.coach')}</p>
                              <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => respondSchool.mutate({ memberId: m.id, coachId: m.coach_id, accept: true })}
                              disabled={respondSchool.isPending}
                              className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t('coaches.approve')}
                            </button>
                            <button
                              onClick={() => respondSchool.mutate({ memberId: m.id, coachId: m.coach_id, accept: false })}
                              disabled={respondSchool.isPending}
                              className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                            >
                              <X className="h-3.5 w-3.5" /> {t('coaches.decline')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Approved coaches */}
              {coaches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('dashboard.noCoachesDesc')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {coaches.map((m: any) => {
                    const coach = m.coach;
                    const isMe = m.coach_id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                        <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {coach?.full_name ?? t('dashboard.coach')}
                            {isMe && <span className="text-xs text-primary ml-1">{t('dashboard.you')}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add coach button */}
              <button
                onClick={() => setShowInvite(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform"
              >
                <UserPlus className="h-4 w-4" /> {t('dashboard.addCoach')}
              </button>
            </>
          )}
        </div>
      </main>

      <CoachBottomNav />

      {/* Invite coach bottom sheet */}
      {showInvite && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowInvite(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-foreground">{t('dashboard.inviteTitle')}</h3>
              <button onClick={() => setShowInvite(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 pb-6 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('dashboard.inviteOptionLink')}</p>
                <ShareLinkButton url={inviteLink} label={t('coaches.shareInvite')} />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t('dashboard.inviteOr')}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('dashboard.inviteOptionCode')}</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 min-h-[44px]">
                  <span className="flex-1 text-base font-mono font-bold tracking-widest text-foreground">{inviteCode}</span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteCode ?? '');
                      toast.success(t('common:actions.linkCopied'));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background/50 active:scale-[0.95] transition-transform shrink-0"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {navigator.share && (
                    <button
                      onClick={async () => {
                        try { await navigator.share({ text: inviteCode ?? '' }); } catch {}
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background/50 active:scale-[0.95] transition-transform shrink-0"
                    >
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {t('dashboard.inviteApprovalHint')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
