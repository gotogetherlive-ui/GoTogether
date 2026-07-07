import SeoContentPage from "@/components/SeoContentPage";
import { absoluteUrl } from "@/lib/seo";
import { commonFaqs, entityDescription, faqJsonLd } from "@/lib/seo-content";

const pageCopy: Record<string, { title: string; answer: string; sections: Array<{ title: string; body: string | string[] }> }> = {
  "/how-it-works": {
    title: "How GoTogether Works",
    answer: "GoTogether helps travelers discover public trips, compare trip details, review organizer profiles, check itinerary and policies, and book securely when ready. The marketplace is built around verified organizers, transparent trip information, and ownership boundaries between each organizer and their trips.",
    sections: [
      { title: "Discover Trips", body: "Browse public trips by destination, category, dates, duration, pickup city, and organizer." },
      { title: "Compare Details", body: ["itinerary", "inclusions", "exclusions", "price", "pickup/drop", "organizer profile", "cancellation policy", "refund policy"] },
      { title: "Book Securely", body: "When a traveler books, payment and booking ownership must follow the organizer that owns the trip. Private booking and payment data never belongs on public SEO pages." },
    ],
  },
  "/verified-organizers": {
    title: "Verified Organizers on GoTogether",
    answer: "Verified organizers are public travel organizer profiles that help travelers review who owns a trip, what destinations they serve, and what public trips they operate. Verification helps discovery, but travelers should still review itinerary, policies, inclusions, exclusions, and support expectations before booking.",
    sections: [
      { title: "What Verification Means", body: "Verification indicates that GoTogether has organizer information to support public marketplace trust signals. It does not replace reading trip-specific terms." },
      { title: "What To Check", body: ["profile name", "destinations served", "trip categories", "upcoming public trips", "policies", "reviews when real"] },
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
      { title: "Important Limit", body: "Public SEO pages must not expose booking confirmations, payment status pages, transaction data, or user contact details." },
    ],
  },
  "/contact": {
    title: "Contact GoTogether",
    answer: "Travelers and organizers can contact GoTogether for marketplace support, trip questions, organizer issues, and booking help. If GoTogether does not publish a physical office address, it should use service-area messaging rather than inventing an address.",
    sections: [
      { title: "Support Topics", body: ["trip questions", "organizer profile questions", "booking support", "refund and cancellation questions", "safety reports"] },
      { title: "Brand Presence", body: "Use consistent GoTogether naming, canonical URLs, and public support channels across search, social previews, and business profiles." },
      { title: "Private Data", body: "Never send payment credentials, KYC documents, or sensitive booking data through public pages." },
    ],
  },
  "/help": {
    title: "GoTogether Help",
    answer: "GoTogether Help is for travelers comparing trips, checking organizers, understanding bookings, reviewing safety expectations, and finding cancellation or refund information. Start with the public trip page and organizer profile, then contact support if key details are missing.",
    sections: [
      { title: "Popular Help Topics", body: ["choosing a trip", "checking organizers", "understanding inclusions", "booking support", "cancellation and refunds", "safety"] },
      { title: "Before You Book", body: "Review the trip facts, policy summaries, itinerary, pickup/drop details, stay type, transport, meals, and support expectations." },
      { title: "Privacy", body: "Help content should never reveal private user profiles, support tickets, bookings, payments, or internal organizer operations." },
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
      answer={copy.answer}
      facts={[
        { label: "Entity", value: "GoTogether" },
        { label: "Market", value: "India-focused travel marketplace" },
        { label: "Public Use", value: "Trip discovery, organizer comparison, trust and support information" },
        { label: "Privacy Rule", value: "No private user, booking, payment, dashboard, admin, or internal data" },
        { label: "Last Updated", value: "July 6, 2026" },
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

