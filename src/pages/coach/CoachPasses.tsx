import { useAuth } from '@/contexts/AuthContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import AbonamentSection from '@/components/coach/AbonamentSection';
import { SessioLoader } from '@/components/SessioLogo';
import { useTranslation } from 'react-i18next';

export default function CoachPasses() {
  const { t } = useTranslation('coach');
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school, isLoading: schoolLoading } = useMySchool();
  const { data: membership, isLoading: membershipLoading } = useMySchoolMembership();

  const schoolId = isSchoolOwner ? school?.id : membership?.school_id;
  const isLoading = isSchoolOwner ? schoolLoading : membershipLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('abonaments.title')} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <SessioLoader />
            </div>
          ) : schoolId ? (
            <AbonamentSection schoolId={schoolId} schoolCountry={school?.country ?? membership?.schools?.country} />
          ) : null}
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
