import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader className="rounded-b-2xl px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Privacy Policy</h1>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-md px-4 pt-6">
        <p className="text-xs text-muted-foreground mb-6">Effective date: April 1, 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>Sessio ("we", "our", "us") operates the Sessio mobile application and website at get-sessio.com (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
            <p className="mt-2">By using Sessio, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="font-medium text-foreground mb-1">Personal information you provide:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, and phone number (during account creation)</li>
              <li>Profile information: sport, city, country, biography (optional, provided by you)</li>
              <li>Messages you send within the app to other users</li>
            </ul>
            <p className="font-medium text-foreground mb-1 mt-3">Information collected automatically:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Push notification subscription data (device endpoint and encryption keys) to deliver notifications</li>
              <li>Basic usage data: training schedules you create or join, attendance records</li>
              <li>Error and crash reports (via Sentry) to improve app stability — these may include device type, OS version, and app state at time of error, but do not include personal messages or profile content</li>
            </ul>
            <p className="font-medium text-foreground mb-1 mt-3">Information we do NOT collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not collect precise GPS location</li>
              <li>We do not access your contacts, camera, or photo library</li>
              <li>We do not collect financial or payment information</li>
              <li>We do not use tracking cookies or advertising identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, operate, and maintain the scheduling service</li>
              <li>Send push notifications for session reminders, messages, and training updates</li>
              <li>Display coach profiles to athletes searching for training (only if coach sets profile as discoverable)</li>
              <li>Track attendance and manage training passes for coaches</li>
              <li>Communicate with you about service updates or respond to support requests</li>
              <li>Monitor and fix technical issues via error reporting</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Data Sharing</h2>
            <p>We share your information only in these limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>With other users:</strong> Your name and profile are visible to coaches and athletes you interact with through trainings. Messages are visible to conversation participants.</li>
              <li><strong>Service providers:</strong> We use Supabase (data hosting, EU region), Vercel (application hosting), Google (authentication), and Sentry (error monitoring). These providers process data on our behalf under their respective privacy policies.</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Data Storage and Security</h2>
            <p>Your data is stored on Supabase servers in the European Union. We use industry-standard security measures including encrypted connections (HTTPS/TLS), row-level security policies, and secure authentication tokens. However, no method of electronic storage is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Data Retention</h2>
            <p>We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed, including your profile, training memberships, messages, attendance records, and notification subscriptions. Some anonymized or aggregated data may be retained for analytics purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p>Under applicable data protection laws (including GDPR), you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> Update or correct your personal data via your profile settings</li>
              <li><strong>Deletion:</strong> Delete your account and all associated data at any time (Profile &rarr; Delete Account)</li>
              <li><strong>Data portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Withdraw consent:</strong> Disable push notifications in your device settings at any time</li>
              <li><strong>Object:</strong> Object to processing of your personal data</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Children's Privacy</h2>
            <p>Sessio is not directed to children under 16. We do not knowingly collect personal information from children under 16. If you believe we have collected data from a child under 16, please contact us and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of material changes by posting the new policy in the app. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> support@get-sessio.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
