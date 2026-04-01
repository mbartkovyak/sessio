import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mb-6">Last updated: April 1, 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Service</h2>
            <p>Sessio provides a scheduling and discovery platform for sports coaches and athletes. By using Sessio, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information during signup</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You may delete your account at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Acceptable Use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use Sessio only for legitimate sports coaching and training purposes</li>
              <li>Do not send spam, abusive, or inappropriate messages</li>
              <li>Do not attempt to access other users' accounts</li>
              <li>Do not use the platform for illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Content</h2>
            <p>You retain ownership of content you create (messages, profile info). By posting content, you grant Sessio a license to display it within the platform as needed to operate the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Payments</h2>
            <p>Sessio is currently free to use. Any future pricing changes will be communicated in advance. Payment processing between coaches and athletes happens outside the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
            <p>Sessio is provided "as is" without warranties. We are not responsible for missed sessions, scheduling errors, or disputes between coaches and athletes. We make best efforts to maintain service availability.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Changes</h2>
            <p>We may update these terms. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Contact</h2>
            <p><strong>Email:</strong> support@sessio.app</p>
          </section>
        </div>
      </div>
    </div>
  );
}
