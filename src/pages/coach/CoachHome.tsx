import { SessioLogoCompact } from '@/components/SessioLogo';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import PendingApprovalScreen from '@/components/coach/PendingApprovalScreen';
import SchoolOverviewSection from '@/components/coach/SchoolOverviewSection';
import CoachOverviewSection from '@/components/coach/CoachOverviewSection';
import { useAuth } from '@/contexts/AuthContext';
import { useMyPendingSchoolRequest } from '@/hooks/school/useSchools';
import { useMySchoolBasic } from '@/hooks/coach/useMySchoolBasic';

export default function CoachHome() {
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: pendingRequest, isLoading: pendingLoading } = useMyPendingSchoolRequest();
  const { data: school, isLoading: schoolLoading } = useMySchoolBasic(profile?.id);

  // Block coach with pending school request
  if (!isSchoolOwner && !pendingLoading && pendingRequest) {
    return <PendingApprovalScreen pendingRequest={pendingRequest} />;
  }

  // Wait for school data before rendering (prevents flash between coach/school views)
  const showLoading = isSchoolOwner && schoolLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with teal gradient */}
      <header className="sticky top-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center gap-2 text-white">
          <SessioLogoCompact />
        </div>
      </header>

      <main className="flex-1 pb-24">
        {showLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isSchoolOwner && school ? (
          <SchoolOverviewSection school={school} />
        ) : (
          <CoachOverviewSection />
        )}
      </main>

      <CoachBottomNav />
    </div>
  );
}
