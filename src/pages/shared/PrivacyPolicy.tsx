import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mb-6">Last updated: April 1, 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">What Sessio Does</h2>
            <p>Sessio is a scheduling and discovery platform for independent sports coaches and their athletes. We help coaches manage training sessions, communicate with athletes, and grow their business.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> Name, email address, phone number (provided during signup)</li>
              <li><strong>Profile data:</strong> Sport, city, country, bio (provided by you)</li>
              <li><strong>Usage data:</strong> Training schedules, attendance records, messages within the app</li>
              <li><strong>Device data:</strong> Push notification subscription (endpoint + keys) for delivering notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and operate the scheduling service</li>
              <li>Send push notifications (session reminders, messages, updates)</li>
              <li>Display coach profiles to athletes searching for training</li>
              <li>Track attendance and manage training passes</li>
            </ul>
            <p className="mt-2">We do not sell your data to third parties. We do not use your data for advertising.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Data Storage</h2>
            <p>Your data is stored on Supabase (hosted in the EU). Authentication is handled via Google OAuth or email OTP. We use Sentry for error monitoring (no personal data is sent to Sentry beyond error context).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> View all your data in your profile</li>
              <li><strong>Delete:</strong> Delete your account at any time (Profile &rarr; Delete Account). This permanently removes all your personal data.</li>
              <li><strong>Export:</strong> Contact us to request a data export</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Push Notifications</h2>
            <p>We send push notifications for session reminders, messages, and training updates. You can disable notifications at any time in your device settings. We do not send marketing notifications.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
            <p>For any privacy questions or data requests:</p>
            <p className="mt-1"><strong>Email:</strong> privacy@sessio.app</p>
          </section>
        </div>
      </div>
    </div>
  );
}
