import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service — GoTogether",
  description:
    "Read the GoTogether Terms of Service. Understand your rights, responsibilities, and the rules governing your use of our travel platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <article className="pt-28 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-orange-500 uppercase tracking-wider">
            Legal
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3">
          Terms of Service
        </h1>
        <p className="text-slate-500 text-sm mb-12">
          Last updated: April 18, 2026
        </p>

        <div className="prose-custom space-y-10">
          {/* 1 */}
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using the GoTogether platform ("Platform"), including our website,
              mobile applications, and all related services, you agree to be bound by these Terms
              of Service ("Terms"). If you do not agree to these Terms, you may not access or use
              the Platform.
            </p>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the
              Platform after any changes constitutes acceptance of the revised Terms. We will
              notify registered users of material changes via email or in-app notification.
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Eligibility">
            <p>You must meet the following requirements to use GoTogether:</p>
            <ul>
              <li>Be at least <strong>18 years of age</strong> or the age of majority in your jurisdiction.</li>
              <li>Provide accurate, complete, and current registration information.</li>
              <li>Not have been previously suspended or removed from the Platform.</li>
              <li>Comply with all applicable local, state, national, and international laws.</li>
            </ul>
          </Section>

          {/* 3 */}
          <Section title="3. Account Registration & Security">
            <p>
              To access certain features, you must create an account. You are responsible for
              maintaining the confidentiality of your login credentials and for all activities
              that occur under your account.
            </p>
            <ul>
              <li>You must use a valid email address and provide truthful profile information, including age and gender where required.</li>
              <li>You may not impersonate another person or create multiple accounts.</li>
              <li>Notify us immediately at <strong>support@gotogether.com</strong> if you suspect unauthorized access.</li>
            </ul>
          </Section>

          {/* 4 */}
          <Section title="4. User Roles & Permissions">
            <p>GoTogether operates with three user roles, each with specific permissions:</p>
            <ul>
              <li>
                <strong>Regular Users</strong> — Can browse trips, submit join requests, and
                create personal trips visible to other users.
              </li>
              <li>
                <strong>Business Accounts</strong> — Verified businesses that can post commercial
                trips. Subject to additional verification requirements and moderation.
              </li>
              <li>
                <strong>Super Admins</strong> — Platform administrators responsible for content
                moderation, user management, and platform operations.
              </li>
            </ul>
          </Section>

          {/* 5 */}
          <Section title="5. Trip Listings & the Stranger Meet Flow">
            <p>
              GoTogether facilitates connections between travelers through our "Stranger Meet"
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

          {/* 6 */}
          <Section title="6. Prohibited Conduct">
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

          {/* 7 */}
          <Section title="7. Content & Intellectual Property">
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

          {/* 8 */}
          <Section title="8. Moderation & Enforcement">
            <p>
              GoTogether reserves the right to review, edit, or remove any content that violates
              these Terms. Enforcement actions include but are not limited to:
            </p>
            <ul>
              <li>Issuing warnings for minor violations.</li>
              <li>Temporarily suspending accounts under investigation.</li>
              <li>Permanently banning users who engage in serious or repeated violations.</li>
              <li>Reporting illegal activity to relevant law enforcement authorities.</li>
            </ul>
            <p>
              Users may appeal moderation decisions by contacting{" "}
              <strong>appeals@gotogether.com</strong> within 14 days.
            </p>
          </Section>

          {/* 9 */}
          <Section title="9. Limitation of Liability">
            <p>
              GoTogether is a platform that facilitates connections between travelers. We are{" "}
              <strong>not</strong> a travel agency, tour operator, or insurance provider.
            </p>
            <ul>
              <li>We do not guarantee the safety, quality, or legality of any trip listed on the Platform.</li>
              <li>We are not liable for any injury, loss, damage, or dispute arising from interactions between users.</li>
              <li>Users participate in trips entirely at their own risk and are encouraged to purchase appropriate travel insurance.</li>
            </ul>
            <p>
              To the maximum extent permitted by law, GoTogether's total liability shall not
              exceed the amount you paid to GoTogether, if any, in the 12 months preceding the
              claim.
            </p>
          </Section>

          {/* 10 */}
          <Section title="10. Termination">
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

          {/* 11 */}
          <Section title="11. Governing Law & Dispute Resolution">
            <p>
              These Terms are governed by the laws of India. Any disputes arising from or relating
              to these Terms or the Platform shall be resolved through binding arbitration in
              accordance with the Arbitration and Conciliation Act, 1996, seated in New Delhi,
              India.
            </p>
          </Section>

          {/* 12 */}
          <Section title="12. Contact Us">
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> legal@gotogether.com</li>
              <li><strong>Support:</strong> support@gotogether.com</li>
            </ul>
          </Section>
        </div>
      </article>

      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-slate-600 text-[15px] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-slate-600">
        {children}
      </div>
    </section>
  );
}
