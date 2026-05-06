import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Lock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — GoTogether",
  description: "Learn how GoTogether collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <article className="pt-28 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">Privacy</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: April 18, 2026</p>

        <div className="space-y-10">
          <S t="Introduction">
            <p>GoTogether (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our platform. By using the Platform, you consent to the data practices described here.</p>
          </S>

          <S t="1. Information We Collect">
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">a) Information You Provide</h3>
            <ul><li><strong>Account Data:</strong> Name, email, password, age, gender, and bio.</li><li><strong>Profile Info:</strong> Interests, travel preferences, photos, and verification documents.</li><li><strong>Trip Data:</strong> Trip listings including destinations, descriptions, dates, and tags.</li><li><strong>Join Requests:</strong> Candidate details submitted when requesting to join a trip.</li><li><strong>Communications:</strong> Messages, reports, feedback, and support requests.</li></ul>
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">b) Automatically Collected</h3>
            <ul><li><strong>Device Data:</strong> IP address, browser type, OS, device identifiers.</li><li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns.</li><li><strong>Location:</strong> Approximate location via IP (precise only with consent).</li><li><strong>Cookies:</strong> Session, analytics, and preference cookies.</li></ul>
            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">c) From Third Parties</h3>
            <ul><li>Social login providers (Google, Apple) if used for sign-in.</li><li>Business verification services for validating business accounts.</li></ul>
          </S>

          <S t="2. How We Use Your Information">
            <ul><li>Create and manage your account and authenticate your identity.</li><li>Display trip listings and facilitate the Stranger Meet flow.</li><li>Match travelers using our priority scoring algorithm.</li><li>Moderate content and enforce our Terms of Service.</li><li>Send transactional notifications (join request updates, trip changes, security alerts).</li><li>Send marketing communications (opt-in only; unsubscribe anytime).</li><li>Analyze usage patterns to improve the Platform.</li><li>Prevent fraud, abuse, and unauthorized access.</li><li>Comply with legal obligations.</li></ul>
          </S>

          <S t="3. How We Share Your Information">
            <p>We do <strong>not</strong> sell your personal information. We may share data as follows:</p>
            <ul><li><strong>With Other Users:</strong> Your public profile is visible to trip organizers and group participants.</li><li><strong>Service Providers:</strong> Trusted vendors for hosting (Supabase/Vercel), analytics, and email, bound by data processing agreements.</li><li><strong>Legal Compliance:</strong> When required by law, court order, or to protect rights and safety.</li><li><strong>Business Transfers:</strong> In connection with a merger or acquisition, with prior notice.</li></ul>
          </S>

          <S t="4. Data Retention">
            <p>We retain personal data while your account is active and as needed to provide services or comply with law. Upon account deletion, data is removed within 30 days, except anonymized analytics and legally required records. Backups purge within 90 days.</p>
          </S>

          <S t="5. Data Security">
            <ul><li><strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest.</li><li><strong>Authentication:</strong> Passwords hashed with bcrypt; 2FA supported.</li><li><strong>Access Controls:</strong> Role-based access with Supabase row-level security (RLS).</li><li><strong>Monitoring:</strong> Continuous security monitoring and vulnerability assessments.</li></ul>
            <p>No method of transmission is 100% secure. We cannot guarantee absolute security.</p>
          </S>

          <S t="6. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul><li><strong>Access</strong> a copy of your personal data.</li><li><strong>Correct</strong> inaccurate data.</li><li><strong>Delete</strong> your data (&quot;right to be forgotten&quot;).</li><li><strong>Port</strong> your data in machine-readable format.</li><li><strong>Restrict</strong> or <strong>object</strong> to certain processing.</li><li><strong>Withdraw consent</strong> at any time.</li></ul>
            <p>Contact <strong>privacy@gotogether.com</strong> to exercise these rights. We respond within 30 days.</p>
          </S>

          <S t="7. Cookies">
            <ul><li><strong>Essential:</strong> Required for authentication and basic functionality.</li><li><strong>Analytics:</strong> Understand user interaction patterns.</li><li><strong>Preference:</strong> Remember your settings.</li></ul>
            <p>Manage cookies via your browser settings. Disabling essential cookies may affect functionality.</p>
          </S>

          <S t="8. Children's Privacy">
            <p>GoTogether is not intended for users under 18. We do not knowingly collect data from minors. If discovered, the account will be terminated and data deleted promptly.</p>
          </S>

          <S t="9. International Transfers">
            <p>Data may be stored and processed in India and other countries where our providers operate. We ensure appropriate safeguards including standard contractual clauses for cross-border transfers.</p>
          </S>

          <S t="10. Changes to This Policy">
            <p>We may update this policy periodically. Material changes will be notified via email or in-app notice at least 14 days before taking effect. Continued use constitutes acceptance.</p>
          </S>

          <S t="11. Contact Us">
            <ul><li><strong>Data Protection:</strong> privacy@gotogether.com</li><li><strong>Support:</strong> support@gotogether.com</li><li><strong>Address:</strong> GoTogether, New Delhi, India</li></ul>
          </S>
        </div>
      </article>
      <Footer />
    </div>
  );
}

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900 mb-3">{t}</h2>
      <div className="text-slate-600 text-[15px] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-slate-600">{children}</div>
    </section>
  );
}
