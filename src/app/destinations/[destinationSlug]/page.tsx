import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoContentPage from "@/components/SeoContentPage";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { commonFaqs, destinationBySlug, destinations, faqJsonLd } from "@/lib/seo-content";

type Props = { params: Promise<{ destinationSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { destinationSlug } = await params;
  const destination = destinationBySlug(destinationSlug);
  if (!destination) return buildMetadata({ title: "Destination Not Found | GoTogether", path: `/destinations/${destinationSlug}`, index: false });

  return buildMetadata({
    title: `${destination.name} Group Trips & Travel Packages | GoTogether`,
    description: `Discover verified ${destination.name} group trips on GoTogether. Compare prices, dates, itineraries, inclusions, organizers, reviews, cancellation policies, and secure booking options.`,
    path: `/destinations/${destination.slug}`,
  });
}

export default async function DestinationPage({ params }: Props) {
  const { destinationSlug } = await params;
  const destination = destinationBySlug(destinationSlug);
  if (!destination) notFound();

  const faqs = [
    {
      question: `Are ${destination.name} group trips good for solo travelers?`,
      answer: `${destination.name} group trips can work well for solo travelers when the itinerary, organizer profile, room-sharing details, pickup point, safety notes, and group format match the traveler's comfort level.`,
    },
    {
      question: `What should I compare before booking a ${destination.name} trip?`,
      answer: "Compare dates, duration, price, itinerary, inclusions, exclusions, pickup city, organizer profile, cancellation terms, refund terms, and visible public reviews where available.",
    },
    ...commonFaqs,
  ];

  return (
    <SeoContentPage
      title={`${destination.name} Group Trips & Travel Experiences`}
      answer={`${destination.name} group trips are useful for travelers who want a shared itinerary, verified organizer context, and clear trip details before booking. On GoTogether, travelers can compare verified ${destination.name} trips by price, dates, duration, itinerary, inclusions, exclusions, pickup city, organizer profile, public reviews when available, and cancellation policy.`}
      facts={[
        { label: "Destination", value: destination.name },
        { label: "Best Time To Visit", value: destination.bestTime },
        { label: "Popular Trip Types", value: "Group trips, weekend trips, backpacking trips, curated travel experiences" },
        { label: "Typical Duration", value: "Check available public trips for real durations" },
        { label: "Common Pickup Cities", value: "Varies by organizer and route" },
        { label: "Top Experiences", value: destination.experiences.join(", ") },
      ]}
      sections={[
        { title: "Available Trips", body: "Available public trips appear in the GoTogether trip marketplace when verified organizers publish approved departures for this destination." },
        { title: "Popular Trip Types", body: ["group trips", "backpacking trips", "weekend trips", "budget trips", "solo travel groups"] },
        { title: "Who This Destination Is Best For", body: `${destination.name} is best for travelers who want ${destination.experiences.join(", ")} with a public itinerary and organizer-led trip structure.` },
        { title: "Safety And Travel Notes", body: "Check current weather, route conditions, pickup/drop details, stay type, transport plan, emergency expectations, and cancellation policy before booking." },
      ]}
      faqs={faqs}
      links={[
        { href: "/trips", label: "Available Trips" },
        { href: "/group-trips", label: "Group Trips" },
        { href: "/weekend-trips", label: "Weekend Trips" },
        { href: "/solo-travel-groups", label: "Solo Travel Groups" },
        ...destinations.filter((item) => item.slug !== destination.slug).slice(0, 4).map((item) => ({ href: `/destinations/${item.slug}`, label: item.name })),
      ]}
      breadcrumb={[
        { name: "Home", path: "/" },
        { name: "Destinations", path: "/destinations" },
        { name: destination.name, path: `/destinations/${destination.slug}` },
      ]}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${destination.name} Group Trips`,
          url: absoluteUrl(`/destinations/${destination.slug}`),
          description: `Verified ${destination.name} group trips and travel experiences on GoTogether.`,
          mainEntity: { "@id": absoluteUrl(`/destinations/${destination.slug}#destination`) },
        },
        {
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          "@id": absoluteUrl(`/destinations/${destination.slug}#destination`),
          name: destination.name,
          url: absoluteUrl(`/destinations/${destination.slug}`),
          description: `${destination.name} travel destination page covering group trips, best time to visit, popular experiences, and booking checks.`,
          touristType: "Group travelers",
          subjectOf: { "@type": "WebPage", url: absoluteUrl(`/destinations/${destination.slug}`) },
        },
        faqJsonLd(faqs),
      ]}
    />
  );
}
