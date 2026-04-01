import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <PageHeader className="rounded-b-2xl px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Terms of Service</h1>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-md px-4 pt-6">
        <p className="text-xs text-muted-foreground mb-6">Effective date: April 1, 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Agreement to Terms</h2>
            <p>By accessing or using Sessio ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. The Service is operated by Sessio ("we", "our", "us").</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>Sessio is a scheduling and communication platform that connects sports coaches with athletes. The Service allows coaches to create and manage training sessions, communicate with athletes, track attendance, and manage training passes. Athletes can discover coaches, join trainings, and manage their schedules.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least 13 years old to create an account (users under 18 need parental consent)</li>
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Send spam, abusive, harassing, or inappropriate messages</li>
              <li>Impersonate another person or misrepresent your qualifications</li>
              <li>Attempt to access other users' accounts or private data</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use automated means (bots, scrapers) to access the Service without permission</li>
              <li>Upload malicious code or content</li>
            </ul>
            <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. User Content</h2>
            <p>You retain ownership of content you create (messages, profile information, training descriptions). By posting content on Sessio, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely for the purpose of operating and providing the Service.</p>
            <p className="mt-2">You are responsible for the content you post and must ensure it does not violate any laws or third-party rights.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Coach Responsibilities</h2>
            <p>Coaches using Sessio are solely responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The accuracy of training information (schedules, venues, descriptions)</li>
              <li>Their qualifications and certifications to provide coaching services</li>
              <li>Compliance with local laws and regulations regarding sports instruction</li>
              <li>The safety of training sessions they organize</li>
              <li>Any financial arrangements with athletes (payments, refunds)</li>
            </ul>
            <p className="mt-2">Sessio is a scheduling tool and does not verify coach credentials, endorse any coach, or guarantee the quality of training services.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Payments</h2>
            <p>Sessio is currently free to use. The Service does not process payments between coaches and athletes. Any financial transactions related to training sessions occur outside the platform and are solely between the coach and athlete. We are not responsible for disputes related to such transactions.</p>
            <p className="mt-2">We reserve the right to introduce paid features in the future, with advance notice to users.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Intellectual Property</h2>
            <p>The Sessio name, logo, and application design are our intellectual property. You may not use our branding without written permission. The Service's source code, design, and functionality are protected by applicable intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
            <p className="mt-2">We do not warrant that the Service will be uninterrupted, error-free, or secure. We make reasonable efforts to maintain service availability but cannot guarantee uptime.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Sessio shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Loss of profits, data, or business opportunities</li>
              <li>Missed training sessions or scheduling errors</li>
              <li>Injuries occurring during training sessions</li>
              <li>Disputes between coaches and athletes</li>
              <li>Unauthorized access to your account</li>
            </ul>
            <p className="mt-2">Our total liability for any claims arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim (or zero if the Service is free).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">11. Account Termination</h2>
            <p>You may delete your account at any time through the app (Profile &rarr; Delete Account). We may suspend or terminate your account if you violate these Terms. Upon termination, your right to use the Service ceases immediately, and your data will be deleted in accordance with our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the European Union and the applicable laws of France, without regard to conflict of law provisions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">13. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify users of material changes by posting the updated terms in the app. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">14. Contact</h2>
            <p>For questions about these Terms of Service, contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> support@get-sessio.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
