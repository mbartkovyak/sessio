import { SessioLogoCompact, SessioLoader } from '@/components/SessioLogo';
import PageHeader from '@/components/shared/PageHeader';
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
      {/* DEBUG: remove after verifying Capgo OTA works */}
      <div className="bg-red-600 text-white text-center py-4 text-lg font-bold">🔴 CAPGO OTA — v3 new key</div>
      <PageHeader className="rounded-b-2xl px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-center text-white">
          <SessioLogoCompact />
        </div>
      </PageHeader>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4">
          <PushNotificationPrompt />
        </div>
        {showLoading ? (
          <div className="flex items-center justify-center py-20">
            <SessioLoader />
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
