import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import { useSchoolAthletesWithPassHolders } from '@/hooks/training/useAbonaments';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import Avatar from '@/components/shared/Avatar';
import ProfileSheet from '@/components/shared/ProfileSheet';
import { SessioLoader } from '@/components/SessioLogo';

export default function CoachAthletes() {
  const { t } = useTranslation('coach');
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school, isLoading: schoolLoading } = useMySchool();
  const { data: membership, isLoading: membershipLoading } = useMySchoolMembership();
  const schoolId = isSchoolOwner ? school?.id : membership?.school_id;
  const isLoading = isSchoolOwner ? schoolLoading : membershipLoading;

  const { data: athletes = [], isLoading: athletesLoading } = useSchoolAthletesWithPassHolders(schoolId);
  const [search, setSearch] = useState('');
  const [viewProfile, setViewProfile] = useState<any>(null);

  const filtered = search.trim()
    ? athletes.filter(a =>
        (a.full_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : athletes;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('athletes.title')} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
          {isLoading || athletesLoading ? (
            <div className="flex items-center justify-center py-20">
              <SessioLoader />
            </div>
          ) : !schoolId ? (
            <p className="text-sm text-muted-foreground text-center py-10">{t('athletes.noSchool')}</p>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('athletes.search')}
                  className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Athlete list */}
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search.trim() ? t('detail.noAthletesFound') : t('athletes.noAthletes')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('athletes.addViaPassesHint')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {filtered.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setViewProfile(a)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <Avatar url={a.avatar_url} name={a.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.full_name ?? '—'}</p>
                        {a.is_placeholder && (
                          <span className="text-xs text-muted-foreground">{t('detail.offlineAthlete')}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">{t('athletes.count', { count: filtered.length })}</p>
            </>
          )}
        </div>
      </main>

      <CoachBottomNav />
      {viewProfile && (
        <ProfileSheet
          profile={viewProfile}
          schoolId={schoolId}
          onClose={() => setViewProfile(null)}
          coachMode
        />
      )}
    </div>
  );
}
