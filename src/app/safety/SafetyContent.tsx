"use client";

import ContactSupportModal from "@/components/ContactSupportModal";
import { ShieldCheck, AlertTriangle, Headset } from "lucide-react";
import { useState } from "react";

export default function SafetyContent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <article className="pt-28 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-emerald-500 uppercase tracking-wider">Safety</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3">Safety Guidelines</h1>
        <p className="text-slate-500 text-sm mb-12">Your safety is our top priority. Please read these guidelines carefully.</p>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-8 text-white mb-12">
          <h2 className="text-2xl font-bold mb-3">Our Safety Promise</h2>
          <p className="text-emerald-50 leading-relaxed">
            GoTogether is built on trust. Every business is verified, every trip is moderated, and every report is reviewed within 24 hours. We provide the tools — but your awareness is the strongest safety measure.
          </p>
        </div>

        <div className="space-y-10">
          <S t="1. Before You Join a Trip">
            <p>Protect yourself by doing your due diligence before committing to any trip:</p>
            <ul>
              <li><strong>Check the organizer&apos;s profile:</strong> Look for the verification badge (blue shield icon).</li>
              <li><strong>Read reviews and ratings:</strong> Past participants&apos; feedback is your best indicator.</li>
              <li><strong>Verify trip details:</strong> Confirm itinerary, costs, meeting points, and cancellation policy.</li>
              <li><strong>Research the destination:</strong> Check travel advisories, visa requirements, and local customs.</li>
              <li><strong>Ask questions:</strong> Use the Stranger Meet flow to ask the organizer anything before committing.</li>
            </ul>
          </S>

          <S t="2. Protecting Your Personal Information">
            <ul>
              <li><strong>Never share</strong> your passport, financial details, or home address in trip requests or messages.</li>
              <li><strong>Use GoTogether messaging</strong> for all initial communication.</li>
              <li><strong>Be cautious</strong> with photos that reveal your exact location or daily routine.</li>
              <li><strong>Use a strong, unique password</strong> for your GoTogether account.</li>
            </ul>
          </S>

          <S t="3. Meeting Fellow Travelers">
            <p>The Stranger Meet flow is designed for safety. Follow these best practices:</p>
            <ul>
              <li><strong>First meetings in public:</strong> Always meet new travel companions in a public, well-lit location.</li>
              <li><strong>Tell someone your plans:</strong> Share your itinerary with a trusted friend or family member.</li>
              <li><strong>Trust your instincts:</strong> If something feels wrong, it probably is.</li>
              <li><strong>Travel with essentials:</strong> Keep your phone charged and carry emergency contacts.</li>
              <li><strong>Group dynamics:</strong> Be respectful of boundaries. Consent is non-negotiable.</li>
            </ul>
          </S>

          <S t="4. During the Trip">
            <ul>
              <li><strong>Stay connected:</strong> Keep your phone charged and maintain communication with someone outside the group.</li>
              <li><strong>Keep copies of documents:</strong> Store digital copies of your passport, ID, and insurance in a secure cloud.</li>
              <li><strong>Know your exits:</strong> Familiarize yourself with accommodation&apos;s exits and local emergency services.</li>
              <li><strong>Monitor your belongings:</strong> Use hotel safes and keep valuables secure.</li>
              <li><strong>Respect local laws:</strong> Abide by the laws and customs of the destination.</li>
              <li><strong>Alcohol and substances:</strong> Exercise caution. Never leave drinks unattended.</li>
            </ul>
          </S>

          <S t="5. For Trip Organizers">
            <p>As an organizer, you have a responsibility to your participants:</p>
            <ul>
              <li><strong>Provide accurate listings:</strong> Misrepresenting costs or itineraries may result in permanent ban.</li>
              <li><strong>Vet participants:</strong> Use the Stranger Meet flow to assess join requests thoughtfully.</li>
              <li><strong>Have a safety plan:</strong> Share emergency contacts and contingency plans with all participants.</li>
              <li><strong>Be transparent about costs:</strong> Clearly break down what is included.</li>
              <li><strong>Report issues promptly:</strong> Report inappropriate behaviour immediately.</li>
            </ul>
          </S>

          {/* Warning Callout */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-700 mb-2">Red Flags to Watch For</h3>
              <ul className="text-sm text-rose-600 space-y-1.5 list-disc pl-5">
                <li>Organizers who pressure you to pay outside the Platform.</li>
                <li>Requests for passport or financial information before meeting.</li>
                <li>Vague or constantly changing trip details.</li>
                <li>Refusal to answer reasonable questions about the trip.</li>
                <li>Profiles with no verification, no reviews, and recently created accounts.</li>
                <li>Trips priced significantly below market rate (too good to be true).</li>
              </ul>
            </div>
          </div>

          <S t="6. Reporting & Getting Help">
            <p>If you encounter unsafe behavior, fraud, or any violation:</p>
            <ul>
              <li><strong>In-app reporting:</strong> Use the report button on any profile, trip, or message to flag it instantly.</li>
              <li><strong>Emergency:</strong> If you are in immediate danger, contact local emergency services first (112 in India).</li>
              <li><strong>Support:</strong> Use the Contact Support button below for general help.</li>
            </ul>
            <p>All reports are confidential. We never reveal the reporter&apos;s identity to the reported user.</p>
          </S>

          <S t="7. Our Moderation Commitment">
            <ul>
              <li>All business accounts undergo identity and legitimacy verification before approval.</li>
              <li>Trip listings from unverified businesses require admin approval before going live.</li>
              <li>Our admin team monitors the Platform 24/7 for suspicious activity.</li>
              <li>Repeat offenders are permanently banned with no appeal.</li>
              <li>We cooperate with law enforcement when criminal activity is suspected.</li>
            </ul>
          </S>

          <S t="8. Travel Insurance">
            <p>GoTogether <strong>strongly recommends</strong> comprehensive travel insurance covering:</p>
            <ul>
              <li>Medical emergencies and evacuation.</li>
              <li>Trip cancellation and interruption.</li>
              <li>Lost or stolen belongings.</li>
              <li>Personal liability.</li>
            </ul>
            <p>GoTogether is not an insurance provider and assumes no liability for incidents during trips.</p>
          </S>

          {/* Need Help — Contact Support Only */}
          <div className="bg-slate-900 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                <Headset className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Need Help?</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">Our safety team is available around the clock. Reach out and we&apos;ll respond within 24 hours.</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold px-8 py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-105"
              >
                <Headset className="w-5 h-5" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </article>

      <ContactSupportModal open={showModal} onClose={() => setShowModal(false)} defaultCategory="safety" />
    </>
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
