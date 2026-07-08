import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { Scale, ShieldCheck, AlertTriangle, UserCheck, ChevronRight, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service - GoTogether",
  description:
    "Read the GoTogether Terms of Service. Understand your rights, responsibilities, and the rules governing your use of our travel platform.",
};

export default function TermsPage() {
  const sections = [
    { id: "accept", title: "1. Acceptance of Terms" },
    { id: "eligibility", title: "2. Eligibility" },
    { id: "security", title: "3. Registration & Security" },
    { id: "roles", title: "4. User Roles & Permissions" },
    { id: "stranger", title: "5. Stranger Meet Flow" },
    { id: "payments", title: "6. Payments, Cancellations & Refunds" },
    { id: "prohibited", title: "7. Prohibited Conduct" },
    { id: "intellectual", title: "8. Content & IP" },
    { id: "moderation", title: "9. Moderation & Bans" },
    { id: "liability", title: "10. Liability Limits" },
    { id: "termination", title: "11. Termination" },
    { id: "governing", title: "12. Governing Law" },
    { id: "contact", title: "13. Contact Us" }
  ];

  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-orange-500/30 selection:text-orange-900 relative overflow-hidden">
        {/* Modern radial blobs */}
        <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[-10%] w-[60%] h-[50%] bg-rose-500/5 rounded-full blur-[150px]"></div>
        </div>

        <Navbar />

        <main className="pt-36 pb-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
          {/* Header Hero Card */}
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 mb-12 relative overflow-hidden shadow-2xl border border-slate-800">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-orange-500/20 to-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Scale className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Legal Agreement</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
                <p className="text-slate-400 text-sm md:text-base max-w-xl">
                  Please read our Terms carefully. They outline your legal rights, responsibilities, and platform codes of conduct.
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
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 mb-4">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Age Restriction</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                You must be at least 18 years old before booking or participating in trips. You can browse trips before completing your dashboard profile.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Safety Standards</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Spam, automated scraping, content theft, or discrimination will trigger immediate and permanent bans.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Liability Limits</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                GoTogether acts as a match engine; we do not govern physical travel details or provide travel insurance.
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
                      className="group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-all"
                    >
                      <span className="truncate">{sec.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content Body */}
            <div className="md:col-span-8 lg:col-span-9 space-y-8">
              <Section id="accept" title="1. Acceptance of Terms">
                <p>
                  By accessing or using the GoTogether platform (&quot;Platform&quot;), including our website,
                  mobile applications, and all related services, you agree to be bound by these Terms
                  of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use
                  the Platform.
                </p>
                <p>
                  We reserve the right to modify these Terms at any time. Continued use of the
                  Platform after any changes constitutes acceptance of the revised Terms. We will
                  notify registered users of material changes via email or in-app notification.
                </p>
              </Section>

              <Section id="eligibility" title="2. Eligibility">
                <p>You must meet the following requirements to use GoTogether:</p>
                <ul>
                  <li>Be at least <strong>18 years of age</strong> before booking or participating in any trip.</li>
                  <li>Provide accurate, complete, and current registration information.</li>
                  <li>Not have been previously suspended or removed from the Platform.</li>
                  <li>Comply with all applicable local, state, national, and international laws.</li>
                </ul>
              </Section>

              <Section id="security" title="3. Account Registration & Security">
                <p>
                  To access certain features, you must create an account. You are responsible for
                  maintaining the confidentiality of your login credentials and for all activities
                  that occur under your account.
                </p>
                <ul>
                  <li>You must use a valid email address and provide truthful dashboard profile information, including full name, phone number, age, gender, profession, and fooding habit before booking.</li>
                  <li>You may not impersonate another person or create multiple accounts.</li>
                  <li>Notify us immediately at <strong className="text-orange-600">support@gotogethertrip.com</strong> if you suspect unauthorized access.</li>
                </ul>
              </Section>

              <Section id="roles" title="4. User Roles & Permissions">
                <p>GoTogether operates with three user roles, each with specific permissions:</p>
                <ul>
                  <li>
                    <strong>Regular Users</strong> - Can browse trips, submit join requests, and
                    create personal trips visible to other users.
                  </li>
                  <li>
                    <strong>Business Accounts</strong> - Verified businesses that can post commercial
                    trips. Subject to additional verification requirements and moderation.
                  </li>
                  <li>
                    <strong>Super Admins</strong> - Platform administrators responsible for content
                    moderation, user management, and platform operations.
                  </li>
                </ul>
              </Section>

              <Section id="stranger" title="5. Trip Listings & the Stranger Meet Flow">
                <p>
                  GoTogether facilitates connections between travelers through our &quot;Stranger Meet&quot;
                  feature. When posting or joining trips, the following rules apply:
                </p>
                <ul>
                  <li>
                    <strong>Trip organizers</strong> must provide accurate descriptions of the trip
                    itinerary, costs, dates, and any safety considerations.
                  </li>
                  <li>
                    <strong>Join requests</strong> must include honest candidate details. Misleading or
                    inappropriate information will result in removal.
                  </li>
                  <li>
                    Organizers retain the right to accept or decline join requests at their sole
                    discretion.
                  </li>
                  <li>
                    GoTogether does not guarantee the accuracy of trip listings and is not a party to
                    any arrangement between organizers and participants.
                  </li>
                </ul>
              </Section>

              <Section id="payments" title="6. Payments, Cancellations & Refunds">
                <p>
                  GoTogether integrates with configured third-party payment gateways such as Razorpay and Cashfree to process paid bookings. By booking a trip, you agree to these payment policies:
                </p>
                <ul>
                  <li><strong>Commercial Bookings:</strong> Bookings for commercial trips require payment verification before confirmation, and users must complete their dashboard profile before booking.</li>
                  <li><strong>100% Automatic Refund Guarantee:</strong> If an Organizer cancels a trip for any reason, GoTogether automatically triggers a 100% full refund of all verified payments. No handling or platform processing fees are deducted.</li>
                  <li><strong>Cancellation Locks:</strong> Trip Organizers are strictly blocked from deleting trips that have active traveler bookings or pending/processing refund operations.</li>
                  <li><strong>Resilience & Manual Retries:</strong> If a gateway outage occurs, our background reconciliation schedules automatic retries. Platform administrators can also manually re-trigger failed refunds via the Admin Dashboard.</li>
                  <li><strong>Traveler Cancellations:</strong> For captured paid bookings, cancellations 72 or more hours before trip start receive a 100% refund; cancellations from 24 hours up to 72 hours receive a 50% refund; cancellations under 24 hours are allowed but non-refundable. Unpaid bookings do not incur cancellation fees.</li>
                </ul>
              </Section>

              <Section id="prohibited" title="7. Prohibited Conduct">
                <p>You agree not to:</p>
                <ul>
                  <li>Post false, misleading, or fraudulent trip listings or profile information.</li>
                  <li>Harass, threaten, or discriminate against other users.</li>
                  <li>Use the Platform for any illegal activity, including but not limited to trafficking, solicitation, or money laundering.</li>
                  <li>Scrape, crawl, or use automated tools to access the Platform without authorization.</li>
                  <li>Attempt to circumvent moderation, verification, or security measures.</li>
                  <li>Upload content that is obscene, defamatory, or infringes on intellectual property rights.</li>
                  <li>Spam other users with unsolicited messages or promotional material.</li>
                </ul>
              </Section>

              <Section id="intellectual" title="8. Content & Intellectual Property">
                <p>
                  You retain ownership of the content you post on GoTogether. However, by posting
                  content, you grant GoTogether a non-exclusive, worldwide, royalty-free license to
                  use, display, reproduce, and distribute your content solely in connection with
                  operating and promoting the Platform.
                </p>
                <p>
                  All GoTogether branding, logos, designs, and proprietary features are the
                  intellectual property of GoTogether and may not be used without written permission.
                </p>
              </Section>

              <Section id="moderation" title="9. Moderation & Enforcement">
                <p>
                  GoTogether reserves the right to review, edit, or remove any content that violates
                  these Terms. Enforcement actions include but are not limited to:
                </p>
                <ul>
                  <li>Spam or harassment filters triggered.</li>
                  <li>Temporary suspensions under security audit.</li>
                  <li>Permanent banning for major or repeated terms violations.</li>
                  <li>Reporting illegal activity to relevant law enforcement.</li>
                </ul>
                <p className="mt-4">
                  Users may appeal moderation decisions by contacting{" "}
                  <strong className="text-orange-600">appeals@gotogethertrip.com</strong> within 14 days.
                </p>
              </Section>

              <Section id="liability" title="10. Limitation of Liability">
                <p>
                  GoTogether is a platform that facilitates connections between travelers. We are{" "}
                  <strong>not</strong> a travel agency, tour operator, or insurance provider.
                </p>
                <ul>
                  <li>We do not guarantee the safety, quality, or legality of any trip listed on the Platform.</li>
                  <li>We are not liable for any injury, loss, damage, or dispute arising from interactions between users.</li>
                  <li>Users participate in trips entirely at their own risk and are encouraged to purchase appropriate travel insurance.</li>
                </ul>
                <p className="mt-4">
                  To the maximum extent permitted by law, GoTogether&apos;s total liability shall not
                  exceed the amount you paid to GoTogether, if any, in the 12 months preceding the
                  claim.
                </p>
              </Section>

              <Section id="termination" title="11. Termination">
                <p>
                  You may delete your account at any time through your account settings. GoTogether
                  may suspend or terminate your account at any time for violation of these Terms,
                  with or without notice.
                </p>
                <p>
                  Upon termination, your right to use the Platform ceases immediately. Sections
                  relating to intellectual property, limitation of liability, and dispute resolution
                  survive termination.
                </p>
              </Section>

              <Section id="governing" title="12. Governing Law & Dispute Resolution">
                <p>
                  These Terms are governed by the laws of India. Any disputes arising from or relating
                  to these Terms or the Platform shall be resolved through binding arbitration in
                  accordance with the Arbitration and Conciliation Act, 1996, seated in New Delhi,
                  India.
                </p>
              </Section>

              <Section id="contact" title="13. Contact Us">
                <p>
                  If you have questions about these Terms, please contact us:
                </p>
                <ul>
                  <li><strong>Email:</strong> legal@gotogethertrip.com</li>
                  <li><strong>Support:</strong> support@gotogethertrip.com</li>
                </ul>
              </Section>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 group bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
        <span className="w-1.5 h-6 rounded-full bg-orange-500"></span> {title}
      </h2>
      <div className="text-slate-600 text-[15px] leading-relaxed space-y-4 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-3 [&_li]:relative [&_li]:pl-6 [&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:top-[0.6em] [&_li::before]:w-2 [&_li::before]:h-2 [&_li::before]:bg-orange-400 [&_li::before]:rounded-full [&_strong]:text-slate-800 text-justify">
        {children}
      </div>
    </section>
  );
}


