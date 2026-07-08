import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { Lock, ShieldCheck, EyeOff, UserCheck, ChevronRight, FileText } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - GoTogether",
  description: "Learn how GoTogether collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  const sections = [
    { id: "intro", title: "Introduction" },
    { id: "collect", title: "1. Information We Collect" },
    { id: "use", title: "2. How We Use Data" },
    { id: "share", title: "3. How We Share Data" },
    { id: "retention", title: "4. Data Retention" },
    { id: "security", title: "5. Data Security" },
    { id: "rights", title: "6. Your Rights" },
    { id: "cookies", title: "7. Cookies" },
    { id: "children", title: "8. Children's Privacy" },
    { id: "transfers", title: "9. International Transfers" },
    { id: "changes", title: "10. Policy Changes" },
    { id: "contact", title: "11. Contact Us" }
  ];

  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-500/30 selection:text-blue-900 relative overflow-hidden">
        {/* Modern radial blobs */}
        <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[-10%] w-[60%] h-[50%] bg-indigo-500/5 rounded-full blur-[150px]"></div>
        </div>

        <Navbar />

        <main className="pt-36 pb-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
          {/* Header Hero Card */}
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 mb-12 relative overflow-hidden shadow-2xl border border-slate-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-blue-500/20 to-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Privacy Shield</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
                <p className="text-slate-400 text-sm md:text-base max-w-xl">
                  We value your trust. This policy explains how we collect, safeguard, and respect your personal information across GoTogether.
                </p>
              </div>
              <div className="flex-shrink-0 bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700 text-slate-300 text-sm">
                <p className="font-semibold text-white mb-1">Last Updated</p>
                <p className="font-mono text-xs text-slate-400">July 6, 2026</p>
              </div>
            </div>
          </div>

          {/* Quick Commitments / Highlights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-4">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Zero Data Selling</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                We strictly do not sell, rent, or trade your personal information to third parties. Period.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">TLS 1.3 Encryption</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Your credentials and communications are fully encrypted in transit and hashed at rest.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 mb-4">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Full User Control</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Request access, correction, deletion, or data portability, and manage location permission in your browser.
              </p>
            </div>
          </div>

          {/* Split Layout: Navigation + Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Sidebar Navigation */}
            <aside className="md:col-span-4 lg:col-span-3">
              <div className="sticky top-28 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hidden md:block">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Table of Contents
                </h3>
                <nav className="space-y-1">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                    >
                      <span className="truncate">{sec.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content Body */}
            <div className="md:col-span-8 lg:col-span-9 space-y-8">
              <S id="intro" t="Introduction">
                <p>GoTogether (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our platform. By using the Platform, you consent to the data practices described here.</p>
              </S>

              <S id="collect" t="1. Information We Collect">
                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">a) Information You Provide</h3>
                <ul>
                  <li><strong>Account and Dashboard Data:</strong> Name, email, password credentials, phone number, dashboard age, gender, bio, profession, fooding habit, photos, and emergency contacts where provided.</li>
                  <li><strong>Profile Info:</strong> Interests, travel preferences, photos, and verification documents for business accounts.</li>
                  <li><strong>Trip Data:</strong> Trip listings (Buddy or Business trips) including destinations, descriptions, dates, pricing, and tags.</li>
                  <li><strong>Join Requests:</strong> Candidate details submitted when requesting to join a trip.</li>
                  <li><strong>Payment & Transactional Data:</strong> When booking paid trips, we collect booking references, passenger details, booking-form phone numbers, payment gateway references, order status, refund status, and support/reconciliation details. Card, UPI, or wallet credentials are handled by third-party payment processors.</li>
                  <li><strong>Communications:</strong> Messages, reports, feedback, and support tickets.</li>
                </ul>
                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">b) Automatically Collected</h3>
                <ul>
                  <li><strong>Device Data:</strong> IP address, browser type, OS, device identifiers.</li>
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns.</li>
                  <li><strong>Location:</strong> Approximate location via IP, and Live Location via Google Maps API only when actively shared with your emergency contacts.</li>
                  <li><strong>Cookies:</strong> Session, analytics, and preference cookies.</li>
                </ul>
                <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">c) From Third Parties</h3>
                <ul>
                  <li>Social login providers (Google OAuth) if used for sign-in.</li>
                  <li>Business verification services for validating business accounts.</li>
                </ul>
              </S>

              <S id="use" t="2. How We Use Your Information">
                <ul>
                  <li>Create and manage your account, authenticate your identity, and verify that booking users meet the GoTogether required age limit of 18 years old.</li>
                  <li>Display trip listings and facilitate the Buddy matching flow.</li>
                  <li>Support traveler matching and organizer review using dashboard profile details such as age, gender, profession, and fooding habits.</li>
                  <li>Moderate content and enforce our Terms of Service.</li>
                  <li>Send transactional notifications (OTP verification, join request updates, security alerts).</li>
                  <li>Send marketing communications (opt-in only; unsubscribe anytime).</li>
                  <li>Analyze usage patterns to improve the Platform.</li>
                  <li>Prevent fraud, abuse, and unauthorized access.</li>
                  <li>Comply with legal obligations.</li>
                </ul>
              </S>

              <S id="share" t="3. How We Share Your Information">
                <p>We do <strong>not</strong> sell your personal information. We may share data as follows:</p>
                <ul>
                  <li><strong>With Other Users:</strong> Your public profile is visible to trip organizers and group participants.</li>
                  <li><strong>Service Providers:</strong> Trusted vendors for hosting, secure database management, location services (Google Maps), email delivery (Resend API), and secure payment processing through configured gateways such as Razorpay and Cashfree.</li>
                  <li><strong>Legal Compliance:</strong> When required by law, court order, or to protect rights and safety.</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger or acquisition, with prior notice.</li>
                </ul>
              </S>

              <S id="retention" t="4. Data Retention">
                <p>We retain personal data while your account is active and as needed to provide services or comply with law. Upon account deletion, data is removed within 30 days, except anonymized analytics and legally required records. Backups purge within 90 days.</p>
              </S>

              <S id="security" t="5. Data Security">
                <ul>
                  <li><strong>Encryption:</strong> TLS in transit, protected database access, and controlled backups at rest.</li>
                  <li><strong>Authentication:</strong> Passwords hashed with bcrypt; secure Google OAuth supported.</li>
                  <li><strong>Access Controls:</strong> Role-based access preventing unauthorized backend actions.</li>
                  <li><strong>Monitoring:</strong> Continuous security monitoring and vulnerability assessments.</li>
                </ul>
                <p className="mt-4 text-xs text-slate-500 italic">No method of transmission is 100% secure. We cannot guarantee absolute security.</p>
              </S>

              <S id="rights" t="6. Your Rights">
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul>
                  <li><strong>Access</strong> a copy of your personal data.</li>
                  <li><strong>Correct</strong> inaccurate data.</li>
                  <li><strong>Delete</strong> your data (&quot;right to be forgotten&quot;).</li>
                  <li><strong>Port</strong> your data in machine-readable format.</li>
                  <li><strong>Restrict</strong> or <strong>object</strong> to certain processing.</li>
                  <li><strong>Withdraw consent</strong> at any time.</li>
                </ul>
                <p className="mt-4">Contact <strong className="text-blue-600">privacy@gotogethertrip.com</strong> to exercise these rights. We respond within 30 days.</p>
              </S>

              <S id="cookies" t="7. Cookies">
                <ul>
                  <li><strong>Essential:</strong> Required for authentication and basic functionality.</li>
                  <li><strong>Analytics:</strong> Understand user interaction patterns.</li>
                  <li><strong>Preference:</strong> Remember your settings.</li>
                </ul>
                <p className="mt-4">Manage cookies via your browser settings. Disabling essential cookies may affect functionality.</p>
              </S>

              <S id="children" t="8. Children's Privacy">
                <p>GoTogether bookings and trip participation are not intended for users under 18. If a dashboard age under 18 is submitted, profile completion for booking is rejected with the GoTogether age-limit message. If we discover a minor using the platform improperly, we may restrict the account and delete data as required.</p>
              </S>

              <S id="transfers" t="9. International Transfers">
                <p>Data may be stored and processed in India and other countries where our providers operate. We ensure appropriate safeguards including standard contractual clauses for cross-border transfers.</p>
              </S>

              <S id="changes" t="10. Changes to This Policy">
                <p>We may update this policy periodically. Material changes will be notified via email or in-app notice at least 14 days before taking effect. Continued use constitutes acceptance.</p>
              </S>

              <S id="contact" t="11. Contact Us">
                <ul>
                  <li><strong>Data Protection:</strong> privacy@gotogethertrip.com</li>
                  <li><strong>Support:</strong> support@gotogethertrip.com</li>
                  <li><strong>Address:</strong> GoTogether, Patna, Bihar, India</li>
                </ul>
              </S>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}

function S({ id, t, children }: { id: string; t: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 group bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-6 rounded-full bg-blue-500"></span> {t}
      </h2>
      <div className="text-slate-600 text-[15px] leading-relaxed space-y-4 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-3 [&_li]:relative [&_li]:pl-6 [&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:top-[0.6em] [&_li::before]:w-2 [&_li::before]:h-2 [&_li::before]:bg-blue-400 [&_li::before]:rounded-full [&_strong]:text-slate-800 text-justify">
        {children}
      </div>
    </section>
  );
}


