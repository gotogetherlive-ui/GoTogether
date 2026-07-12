"use client";

import { useState } from "react";
import { CheckCircle, FileText, Loader2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";

const termsSections = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using the GoTogether platform, including our website, applications, and related services, you agree to be bound by these Terms of Service. If you do not agree, you may not access or use the platform.",
      "We may update these Terms from time to time. Continued use of GoTogether after material changes means you accept the revised Terms.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 18 years old, or the age of majority in your jurisdiction, before booking or participating in trips. You may browse trips before completing your dashboard profile.",
      "You agree to provide accurate, complete, and current account information and to comply with applicable laws.",
    ],
  },
  {
    title: "3. Account Registration and Security",
    body: [
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.",
      "You may not impersonate another person, create misleading accounts, or use another user's account without permission. Notify support@gotogethertrip.com if you suspect unauthorized access.",
    ],
  },
  {
    title: "4. User Roles and Permissions",
    body: [
      "Regular users may browse trips, submit join requests, and create personal trips where supported. Booking requires a complete dashboard profile with full name, phone number, age, gender, profession, and fooding habit.",
      "Business accounts may post commercial trips after verification and are subject to additional organizer and payment requirements.",
      "Super admins operate moderation, safety, support, user management, and platform administration tools.",
    ],
  },
  {
    title: "5. Trip Listings and Join Requests",
    body: [
      "Trip organizers must provide accurate trip descriptions, dates, costs, inclusions, exclusions, and safety information.",
      "Join requests must contain truthful candidate details. Organizers may accept or decline join requests at their discretion.",
      "GoTogether facilitates discovery and connection but is not a party to offline arrangements between users unless explicitly stated for a paid platform booking flow.",
    ],
  },
  {
    title: "6. Payments, Cancellations, and Refunds",
    body: [
      "Paid bookings may be processed through third-party payment gateways. Payment confirmation is required before a paid booking is treated as confirmed.",
      "If an organizer cancels a paid trip, GoTogether triggers a full refund of captured payments according to the platform refund workflow.",
      "Traveler cancellations for captured paid bookings follow GoTogether's standard windows: 72 or more hours before trip start receives a 100% refund, 24 to under 72 hours receives a 50% refund, and under 24 hours is allowed but non-refundable. Unpaid bookings do not incur cancellation fees.",
    ],
  },
  {
    title: "7. Prohibited Conduct",
    body: [
      "You may not post false listings, harass users, discriminate, upload illegal or infringing content, scrape the platform, spam users, bypass security controls, or use GoTogether for illegal activity.",
      "Violations may result in content removal, account suspension, permanent bans, payment restrictions, or reporting to appropriate authorities.",
    ],
  },
  {
    title: "8. Content and Intellectual Property",
    body: [
      "You retain ownership of content you submit, but grant GoTogether a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute that content for operating and promoting the platform.",
      "GoTogether branding, software, designs, and proprietary features may not be copied or used without permission.",
    ],
  },
  {
    title: "9. Moderation and Enforcement",
    body: [
      "GoTogether may review, edit, restrict, or remove content that violates these Terms or creates safety, legal, fraud, or platform integrity risks.",
      "Appeals may be sent to support@gotogethertrip.com within 14 days of an enforcement action.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    body: [
      "GoTogether is a platform for travel discovery and coordination. We are not a travel insurer and do not guarantee the safety, quality, legality, or suitability of any trip or user interaction.",
      "To the maximum extent permitted by law, GoTogether is not liable for indirect, incidental, special, consequential, or punitive damages, or for offline disputes between users.",
    ],
  },
  {
    title: "11. Termination",
    body: [
      "You may stop using GoTogether or request account deletion where available. We may suspend or terminate accounts that violate these Terms or create risk to users or the platform.",
      "Terms relating to intellectual property, liability limits, dispute resolution, and legal compliance survive termination.",
    ],
  },
  {
    title: "12. Governing Law and Disputes",
    body: [
      "These Terms are governed by the laws of India. Disputes relating to these Terms or the platform may be resolved through appropriate courts or arbitration seated in Patna, Bihar, India, where applicable.",
    ],
  },
  {
    title: "13. Contact",
    body: ["For all questions, contact support@gotogethertrip.com. Address: Patna, Bihar, India."],
  },
];

const privacySections = [
  {
    title: "1. Information We Collect",
    body: [
      "We collect account and dashboard data such as name, email, password credentials, phone details, age, gender, bio, profession, fooding habits, photos, and verification information where needed.",
      "We collect trip data, join request details, passenger and booking-form contact details, booking and transaction references, refund records, support messages, reports, feedback, device data, usage data, approximate location, cookies, and OAuth information when social login is used.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "We use information to create and secure accounts, authenticate users, display trip listings, process join requests and bookings, personalize matching, send transactional notices, provide support, prevent fraud, moderate content, improve the platform, and comply with law.",
    ],
  },
  {
    title: "3. Sharing Information",
    body: [
      "We do not sell personal information. We may share information with other users as part of visible profiles, trips, join requests, and group participation.",
      "We may share information with service providers for hosting, database operation, maps, email delivery, cloud uploads, analytics, payment processing, fraud prevention, legal compliance, and business transfers with appropriate safeguards.",
    ],
  },
  {
    title: "4. Retention and Deletion",
    body: [
      "We retain personal data while your account is active and as needed for services, safety, dispute handling, legal obligations, payment reconciliation, and abuse prevention.",
      "After account deletion, data is removed or anonymized according to operational and legal requirements. Backups may persist for a limited period before scheduled purge.",
    ],
  },
  {
    title: "5. Security",
    body: [
      "We use safeguards such as encrypted transport, hashed passwords, role-based access, monitoring, and controlled access to protect data. No method of transmission or storage is completely secure.",
    ],
  },
  {
    title: "6. Your Rights",
    body: [
      "Depending on your jurisdiction, you may request access, correction, deletion, portability, restriction, objection, or withdrawal of consent. Contact support@gotogethertrip.com for privacy requests.",
    ],
  },
  {
    title: "7. Cookies and Tracking",
    body: [
      "We use essential cookies for authentication and functionality, and may use preference or analytics cookies to improve the product. Browser settings may allow you to restrict cookies, but some features may stop working.",
    ],
  },
  {
    title: "8. Children, Transfers, and Changes",
    body: [
      "GoTogether bookings and trip participation are not intended for users under 18. Dashboard profile completion for booking is rejected when the age submitted is below the GoTogether required age limit of 18 years old. Data may be processed in India or other countries where our providers operate, using appropriate safeguards.",
      "We may update this Privacy Policy. Material changes may be notified by email or in-app notice. Continued use means acceptance of updated practices.",
    ],
  },
  {
    title: "9. Privacy Contact",
    body: ["For privacy questions or requests, contact support@gotogethertrip.com. Address: Patna, Bihar, India."],
  },
];

function LegalSection({ title, body }: { title: string; body: string[] }) {
  return (
    <section className="space-y-2 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      {body.map((paragraph) => (
        <p key={paragraph} className="text-xs leading-relaxed text-slate-600">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

export default function TermsAcceptanceGate() {
  const { user, refreshSession } = useSession();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.terms_accepted_at) return null;

  const handleAccept = async () => {
    if (!accepted || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/terms", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save your acceptance. Please try again.");
        return;
      }
      refreshSession();
    } catch {
      setError("Could not save your acceptance. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="h-1.5 shrink-0 bg-gradient-to-r from-orange-500 via-rose-500 to-orange-500" />
        <div className="shrink-0 p-5 pb-3 sm:p-7 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Review and Accept GoTogether Terms</h2>
              <p className="text-sm text-slate-500">Read the document below before continuing.</p>
            </div>
          </div>
        </div>

        <div className="mx-5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:mx-7 sm:p-5">
          <article className="min-w-0 space-y-5 break-words">
            <header className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-950">Terms of Service</h3>
              <p className="text-xs font-semibold text-slate-500">Last updated: July 6, 2026</p>
            </header>
            {termsSections.map((section) => (
              <LegalSection key={section.title} title={section.title} body={section.body} />
            ))}

            <header className="space-y-1 border-t border-slate-300 pt-5">
              <h3 className="text-base font-extrabold text-slate-950">Privacy Policy</h3>
              <p className="text-xs font-semibold text-slate-500">Last updated: July 6, 2026</p>
            </header>
            {privacySections.map((section) => (
              <LegalSection key={section.title} title={section.title} body={section.body} />
            ))}
          </article>
        </div>

        <div className="shrink-0 p-5 pt-4 sm:p-7 sm:pt-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>I have read and agree to the Terms of Service and Privacy Policy shown above, including the 18+ booking requirement.</span>
          </label>

          {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
}

