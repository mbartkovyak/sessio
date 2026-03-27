import { SessioLogoCompact } from '@/components/SessioLogo';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import PendingApprovalScreen from '@/components/coach/PendingApprovalScreen';
import SchoolOverviewSection from '@/components/coach/SchoolOverviewSection';
import CoachOverviewSection from '@/components/coach/CoachOverviewSection';
import PushNotificationPrompt from '@/components/shared/PushNotificationPrompt';
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
      <header className="fixed top-0 left-0 right-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center justify-center text-white">
          <SessioLogoCompact />
        </div>
      </header>
      <div className="px-4 py-4 header-gradient invisible" aria-hidden="true">
        <div className="max-w-md mx-auto h-7" />
      </div>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4">
          <PushNotificationPrompt />
        </div>
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
