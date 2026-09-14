import SeoContentPage from "@/components/SeoContentPage";
import { absoluteUrl } from "@/lib/seo";
import { commonFaqs, entityDescription, faqJsonLd } from "@/lib/seo-content";

const pageCopy: Record<string, { title: string; answer: string; sections: Array<{ title: string; body: string | string[] }> }> = {
  "/how-it-works": {
    title: "How GoTogether Works",
    answer: "GoTogether helps travelers discover public trips, compare trip details, review organizer profiles, check itinerary and policies, and book securely when ready. Compare what is included and get to know your organizer before making a decision.",
    sections: [
      { title: "Discover Trips", body: "Browse public trips by destination, category, dates, duration, pickup city, and organizer." },
      { title: "Compare Details", body: ["itinerary", "inclusions", "exclusions", "price", "pickup/drop", "organizer profile", "cancellation policy", "refund policy"] },
      { title: "Book Securely", body: "Open the trip you want to join, review the booking details, and follow the payment steps. You can find your booking and payment status in your dashboard." },
    ],
  },
  "/verified-organizers": {
    title: "Verified Organizers on GoTogether",
    answer: "Verified organizers are public travel organizer profiles that help travelers review who owns a trip, what destinations they serve, and what public trips they operate. Verification helps discovery, but travelers should still review itinerary, policies, inclusions, exclusions, and support expectations before booking.",
    sections: [
      { title: "What Verification Means", body: "GoTogether reviews organizer information. Check the organizer’s profile and read the terms for your specific trip before booking." },
      { title: "What To Check", body: ["profile name", "destinations served", "trip categories", "upcoming public trips", "policies", "traveler reviews"] },
      { title: "Reporting Issues", body: "Travelers can contact GoTogether support if public organizer details appear unclear, misleading, or unsafe." },
    ],
  },
  "/cancellation-policy": {
    title: "Cancellation Policy",
    answer: "GoTogether uses a standard cancellation window for captured paid traveler bookings: 72 or more hours before trip start receives a 100% refund, 24 to under 72 hours receives a 50% refund, and under 24 hours is allowed but non-refundable. Organizer-cancelled paid trips receive a full captured-payment refund, while unpaid bookings do not incur cancellation fees.",
    sections: [
      { title: "Before Booking", body: "Complete your dashboard profile before booking, confirm trip start time, check inclusions and exclusions, and review the standard refund windows before paying." },
      { title: "Refund Windows", body: ["72 or more hours before trip start: 100% refund", "24 to under 72 hours before trip start: 50% refund", "under 24 hours before trip start: cancellation allowed with no refund", "organizer cancels a paid trip: full captured-payment refund"] },
      { title: "Support", body: "Contact GoTogether support when policy details are missing or unclear before you pay." },
    ],
  },
  "/refund-policy": {
    title: "Refund Policy",
    answer: "Refund eligibility depends on payment state, trip status, cancellation timing, and the GoTogether marketplace rules shown during booking. Captured paid traveler cancellations follow the 72-hour, 24-hour, and under-24-hour refund windows; unpaid bookings have no payment to refund and no cancellation fee.",
    sections: [
      { title: "What Affects Refunds", body: ["traveler cancellation timing", "organizer cancellation", "payment capture status", "gateway refund status", "trip start time"] },
      { title: "What To Save", body: "Keep your booking reference, payment confirmation, passenger contact details used for the booking, cancellation request details, and support thread for faster resolution." },
      { title: "Track Your Refund", body: "Check the booking in your dashboard for its latest status. If you need help, contact support with your booking reference and cancellation details." },
    ],
  },
  "/contact": {
    title: "Contact GoTogether",
    answer: "Travelers and organizers can contact GoTogether for marketplace support, trip questions, organizer issues, and booking help. Use Contact Support to send our team a message.",
    sections: [
      { title: "Support Topics", body: ["trip questions", "organizer profile questions", "booking support", "refund and cancellation questions", "safety reports"] },
      { title: "Help Us Help You", body: "Tell us which trip you are asking about and include your booking reference if you have one. Describe what happened and the help you need." },
      { title: "Private Data", body: "Never send payment credentials, KYC documents, or sensitive booking data through public pages." },
    ],
  },
  "/help": {
    title: "GoTogether Help",
    answer: "GoTogether Help is for travelers comparing trips, checking organizers, understanding bookings, reviewing safety expectations, and finding cancellation or refund information. Start with the public trip page and organizer profile, then contact support if key details are missing.",
    sections: [
      { title: "Popular Help Topics", body: ["choosing a trip", "checking organizers", "understanding inclusions", "booking support", "cancellation and refunds", "safety"] },
      { title: "Before You Book", body: "Review the trip facts, policy summaries, itinerary, pickup/drop details, stay type, transport, meals, and support expectations." },
      { title: "Privacy", body: "Keep booking references and personal details in your private support conversation. Never share passwords, card details, or one-time codes." },
    ],
  },
};

export default function TrustSeoPage({ path }: { path: keyof typeof pageCopy }) {
  const copy = pageCopy[path];
  const faqs = [
    {
      question: "What is GoTogether?",
      answer: entityDescription,
    },
    ...commonFaqs,
  ];

  return (
    <SeoContentPage
      title={copy.title}
      showSupportAction={path === "/contact" || path === "/help"}
      answer={copy.answer}
      facts={[
        { label: "For", value: "Travelers and organizers" },
        { label: "Explore", value: "Group trips across India" },
        { label: "Plan", value: "Compare dates, prices, and itineraries" },
        { label: "Need a hand?", value: "Contact our support team" },
        { label: "Manage your trip", value: "Bookings in your dashboard" },
      ]}
      sections={copy.sections}
      faqs={faqs}
      links={[
        { href: "/trips", label: "Browse Trips" },
        { href: "/verified-organizers", label: "Verified Organizers" },
        { href: "/safety", label: "Safety" },
        { href: "/cancellation-policy", label: "Cancellation Policy" },
        { href: "/refund-policy", label: "Refund Policy" },
      ]}
      breadcrumb={[
        { name: "Home", path: "/" },
        { name: copy.title, path },
      ]}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: copy.title,
          url: absoluteUrl(path),
          description: copy.answer,
        },
        faqJsonLd(faqs),
      ]}
    />
  );
}

