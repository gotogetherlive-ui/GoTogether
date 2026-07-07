"use client";

import ContactSupportModal from "@/components/ContactSupportModal";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Headset, 
  Users, 
  Lock, 
  Compass, 
  MapPin, 
  UserCheck, 
  ShieldAlert, 
  FileText 
} from "lucide-react";
import { useState } from "react";

export default function SafetyContent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <article className="pt-36 pb-24 px-6 md:px-12 max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Trust &amp; Safety</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">Safety Guidelines</h1>
        <p className="text-slate-500 text-sm md:text-base mb-3">Your safety is our absolute priority. Please read these platform guidelines carefully.</p>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-12">Last updated: July 6, 2026</p>

        {/* Safety Promise Block */}
        <div className="relative bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 mb-12 overflow-hidden shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Our Safety Promise</h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                GoTogether is built on trust. Every business organizer is verified, all listings are moderated, and all reports are reviewed within 24 hours. We give you advanced safety features—but your situational awareness is your strongest protection.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Cards Grid */}
        <div className="space-y-8">
          <S t="1. Before You Join a Trip" icon={Compass}>
            <p>Protect yourself by performing necessary due diligence before committing to any trip:</p>
            <ul>
              <li><strong>Verify Organizer Badges:</strong> Look for the golden verification checkmark for business trips. For buddy trips, inspect profile status.</li>
              <li><strong>Read Participant Reviews:</strong> Past travelers&apos; authentic feedback is your absolute best trust indicator.</li>
              <li><strong>Review Full Details:</strong> Confirm the planned itineraries, pricing breakdowns, rules, and refund policies. Paid traveler cancellations follow the platform refund windows: 72 or more hours before start receives 100%, 24 to under 72 hours receives 50%, and under 24 hours is non-refundable. Organizer-cancelled paid trips receive a full captured-payment refund.</li>
              <li><strong>Research the Destination:</strong> Be proactive in checking travel advisories, visas, weather guides, and local cultures.</li>
              <li><strong>Communicate First:</strong> Use our chat features to ask questions and interview the organizer before booking.</li>
            </ul>
          </S>

          <S t="2. Protecting Personal Information" icon={Lock}>
            <ul>
              <li><strong>Keep Data Secure:</strong> Never disclose passport copies, credit cards, banking info, or home addresses in messaging drafts.</li>
              <li><strong>Keep Chats On-Platform:</strong> Use GoTogether&apos;s secured chat logs for all communication. Avoid transitioning to external apps immediately.</li>
              <li><strong>Secure Your Credentials:</strong> Maintain password rules. Enable Multi-Factor credentials if available.</li>
              <li><strong>Photo Awareness:</strong> Exercise caution when sending media containing markers that reveal your immediate location.</li>
            </ul>
          </S>

          <S t="3. Meeting Fellow Travelers" icon={Users}>
            <p>Buddy matching helps you discover adventure groups. Please align with these best practices:</p>
            <ul>
              <li><strong>Public Meetings First:</strong> Meet travel matches in daylight, public settings (cafes, transit points) before starting the journey.</li>
              <li><strong>Share Itineraries:</strong> Broadcast trip files, destination nodes, and match profiles with emergency contacts or family.</li>
              <li><strong>Trust Gut Feelings:</strong> If interactions feel uncomfortable, withdraw booking requests instantly.</li>
              <li><strong>Establish Group Norms:</strong> Respect individual limits, dietary habits, and personal space. Consent is absolute.</li>
            </ul>
          </S>

          <S t="4. During the Trip & Location Tracking" icon={MapPin}>
            <ul>
              <li><strong>Google Maps Location:</strong> Toggle our dashboard Location Tracker to update trusted emergency contacts in real-time.</li>
              <li><strong>Backup Documents:</strong> Store digital scans of your travel visas, passports, insurance, and medical info in private cloud drives.</li>
              <li><strong>Stay Fully Charged:</strong> Carry portable power hubs and maintain constant check-ins with friends outside the group.</li>
              <li><strong>Exits & Safety Nodes:</strong> Familiarize yourself with hotel exit patterns and national emergency response numbers.</li>
            </ul>
          </S>

          <S t="5. For Trip Organizers" icon={UserCheck}>
            <p>As a verified organizer, you hold duty of care responsibilities towards candidates:</p>
            <ul>
              <li><strong>Publish Truthful Details:</strong> Present precise, actual costs and milestones. Deceptive marketing triggers immediate bans.</li>
              <li><strong>Screen Travelers Mindfully:</strong> Review applicant profiles, matching metrics, and food habits carefully.</li>
              <li><strong>Detail Safety Backups:</strong> Prepare emergency exit blueprints, local clinics information, and support contacts list.</li>
            </ul>
          </S>

          {/* Warning Callout */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-8 flex flex-col sm:flex-row gap-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-rose-900 mb-3 tracking-tight">Red Flags to Watch For</h3>
              <ul className="text-slate-700 text-sm space-y-3 list-none pl-0">
                {[
                  "Organizers who pressure you to pay outside the Platform or bypass the approved checkout gateway.",
                  "Requests for your passport copies, security PINs, or financial details before meeting physically.",
                  "Vague, undocumented, or constantly changing trip timelines or meeting coordinates.",
                  "Defensive replies or refusal to answer reasonable questions about the itinerary.",
                  "Profiles with zero verifications, no reviews, and accounts created within the past 48 hours.",
                  "Trips priced significantly below standard costs (if it sounds too good to be true, it likely is)."
                ].map((flag, idx) => (
                  <li key={idx} className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:bg-rose-500 before:rounded-full text-justify">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <S t="6. Reporting & Getting Help" icon={ShieldAlert}>
            <p>If you experience any harassment, rule violation, or unsafe behaviors:</p>
            <ul>
              <li><strong>Instant Reporting:</strong> Click the report flags directly on user profiles, message rows, or trip details grids.</li>
              <li><strong>Emergency Dispatch:</strong> Call local enforcement instantly if in immediate danger (dial 112 in India).</li>
              <li><strong>Confidential Process:</strong> All reports remain entirely anonymous. We never reveal reporter identities.</li>
            </ul>
          </S>

          <S t="7. Our Moderation Commitment" icon={ShieldCheck}>
            <ul>
              <li>Business candidates undergo visual identity audits and license checks.</li>
              <li>Trips launched by businesses require admin verification before publication.</li>
              <li>The moderation crew watches live threads 24/7 for suspicious triggers.</li>
              <li>Banned accounts lose platform access permanently with zero appeal options.</li>
            </ul>
          </S>

          <S t="8. Travel Insurance" icon={FileText}>
            <p>GoTogether strongly encourages securing traveler insurance covering:</p>
            <ul>
              <li>Critical medical emergency dispatch, airlifts, and hospital stays.</li>
              <li>Itinerary updates, delays, or cancellations.</li>
              <li>Damaged, stolen, or lost personal goods.</li>
            </ul>
          </S>

          {/* Need Help — Contact Support Only */}
          <div className="bg-slate-950 rounded-[2.5rem] p-10 text-center relative overflow-hidden border border-slate-900 shadow-2xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-teal-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Headset className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Still have questions?</h2>
                <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
                  Our dedicated trust &amp; safety agents are online 24/7 to resolve disputes, review report flags, and guide your journey.
                </p>
              </div>
              <div>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-8 py-4 rounded-full transition-all duration-300 shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.03]"
                >
                  <Headset className="w-5 h-5" />
                  Contact Safety Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <ContactSupportModal open={showModal} onClose={() => setShowModal(false)} defaultCategory="safety" />
    </>
  );
}

function S({ 
  t, 
  icon: Icon, 
  children 
}: { 
  t: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode 
}) {
  return (
    <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.02)] transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/40"></div>
      <h2 className="text-xl font-bold text-slate-900 mb-5 tracking-tight flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
          <Icon className="w-5 h-5" />
        </div>
        {t}
      </h2>
      <div className="text-slate-600 text-[14px] leading-relaxed space-y-3 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-3 [&_li]:relative [&_li]:pl-6 [&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-0 [&_li::before]:top-[0.6em] [&_li::before]:w-2 [&_li::before]:h-2 [&_li::before]:bg-emerald-400 [&_li::before]:rounded-full [&_strong]:text-slate-800 text-justify">
        {children}
      </div>
    </section>
  );
}

