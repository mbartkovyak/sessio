import { SessioLogoCompact } from '@/components/SessioLogo';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import SchoolViewToggle from '@/components/coach/SchoolViewToggle';
import PendingApprovalScreen from '@/components/coach/PendingApprovalScreen';
import SchoolOverviewSection from '@/components/coach/SchoolOverviewSection';
import CoachOverviewSection from '@/components/coach/CoachOverviewSection';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolView } from '@/contexts/SchoolViewContext';
import { useMyPendingSchoolRequest } from '@/hooks/school/useSchools';
import { useMySchoolBasic } from '@/hooks/coach/useMySchoolBasic';

export default function CoachHome() {
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { view } = useSchoolView();
  const { data: pendingRequest, isLoading: pendingLoading } = useMyPendingSchoolRequest();
  const { data: school } = useMySchoolBasic(profile?.id);

  // Block coach with pending school request
  if (!isSchoolOwner && !pendingLoading && pendingRequest) {
    return <PendingApprovalScreen pendingRequest={pendingRequest} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <SessioLogoCompact />
          <div className="ml-auto"><SchoolViewToggle /></div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {isSchoolOwner && view === 'school' && school ? (
          <SchoolOverviewSection school={school} />
        ) : (
          <CoachOverviewSection />
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
