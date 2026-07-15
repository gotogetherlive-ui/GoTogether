import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoContentPage from "@/components/SeoContentPage";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { categories, categoryBySlug, cityPageBySlug, commonFaqs, destinations } from "@/lib/seo-content";

type Props = { params: Promise<{ seoSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seoSlug } = await params;
  const category = categoryBySlug(seoSlug);
  const cityPage = cityPageBySlug(seoSlug);

  if (category) {
    return buildMetadata({
      title: `${category.name} in India | Verified Travel Experiences | GoTogether`,
      description: `Explore verified ${category.name.toLowerCase()} in India on GoTogether. Compare destinations, prices, itineraries, dates, organizers, reviews, and cancellation policies before booking.`,
      path: `/${category.slug}`,
      index: false,
      follow: true,
    });
  }

  if (cityPage) {
    return buildMetadata({
      title: `Weekend Trips from ${cityPage.city} | Verified Group Trips | GoTogether`,
      description: `Compare verified weekend trips from ${cityPage.city} on GoTogether by destination, price, pickup point, dates, itinerary, inclusions, organizer details, and cancellation policy.`,
      path: `/${cityPage.slug}`,
      index: false,
      follow: true,
    });
  }

  return buildMetadata({ title: "Page Not Found | GoTogether", path: `/${seoSlug}`, index: false });
}

export default async function SeoSlugPage({ params }: Props) {
  const { seoSlug } = await params;
  const category = categoryBySlug(seoSlug);
  const cityPage = cityPageBySlug(seoSlug);

  if (category) {
    const faqs = [
      {
        question: `What are ${category.name.toLowerCase()}?`,
        answer: `${category.name} are organizer-led travel experiences where travelers compare public trip details such as destination, price, dates, itinerary, inclusions, exclusions, organizer profile, and cancellation policy before booking.`,
      },
      ...commonFaqs,
    ];

    return (
      <SeoContentPage
        title={`${category.name} in India`}
        answer={`${category.name} are planned travel experiences where travelers can join a public itinerary organized by a travel organizer. On GoTogether, users can compare verified ${category.name.toLowerCase()} by destination, price, dates, duration, itinerary, inclusions, reviews when real reviews exist, organizer profile, and cancellation policy.`}
        facts={[
          { label: "Category Type", value: category.name },
          { label: "Best For", value: category.bestFor },
          { label: "Popular Destinations", value: destinations.slice(0, 6).map((destination) => destination.name).join(", ") },
          { label: "Typical Duration", value: "Varies by public trip and route" },
          { label: "What To Check", value: "Itinerary, inclusions, exclusions, pickup point, organizer profile, policies" },
        ]}
        sections={[
          { title: "Available Trips", body: "Available trips depend on real organizer inventory. Empty or low-quality combinations should not be treated as indexable booking pages." },
          { title: "Best Destinations", body: destinations.slice(0, 8).map((destination) => destination.name) },
          { title: "Who This Is Best For", body: category.bestFor },
          { title: "Before Booking", body: "Check price, dates, itinerary, inclusions, exclusions, cancellation policy, refund summary, pickup/drop details, stay type, transport, meals, and organizer verification." },
        ]}
        faqs={faqs}
        links={[
          { href: "/trips", label: "Browse Trips" },
          { href: "/destinations", label: "Destinations" },
          { href: "/safety", label: "Safety" },
          ...categories.filter((item) => item.slug !== category.slug).slice(0, 5).map((item) => ({ href: `/${item.slug}`, label: item.name })),
        ]}
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: category.name, path: `/${category.slug}` },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${category.name} in India`,
            url: absoluteUrl(`/${category.slug}`),
          },
        ]}
      />
    );
  }

  if (cityPage) {
    const faqs = [
      {
        question: `What are popular weekend trips from ${cityPage.city}?`,
        answer: `Weekend trips from ${cityPage.city} often include short group trips to ${cityPage.destinations.join(", ")} depending on organizer inventory and season.`,
      },
      ...commonFaqs,
    ];

    return (
      <SeoContentPage
        title={`Weekend Trips from ${cityPage.city}`}
        answer={`Weekend trips from ${cityPage.city} usually include short group trips to destinations such as ${cityPage.destinations.join(", ")}. On GoTogether, travelers can compare verified weekend trips from ${cityPage.city} by price, pickup point, dates, itinerary, inclusions, public reviews when available, and organizer details.`}
        facts={[
          { label: "Starting City", value: cityPage.city },
          { label: "Popular Weekend Destinations", value: cityPage.destinations.join(", ") },
          { label: "Typical Duration", value: "Usually 1-3 nights depending on route" },
          { label: "Pickup Information", value: "Check trip page for real pickup points" },
          { label: "Best Trip Types", value: "Weekend trips, group trips, budget trips, camping trips" },
        ]}
        sections={[
          { title: "Available Trips", body: "Available public weekend trips depend on current organizer departures, seats, route conditions, and approval status." },
          { title: "Popular Destinations", body: cityPage.destinations },
          { title: "Pickup Point Information", body: "Pickup points vary by organizer and route. Always confirm the exact pickup location, reporting time, transport type, and drop point before booking." },
          { title: "Travel Style Options", body: ["budget group trips", "camping trips", "backpacking trips", "trekking trips", "women-only trips where available"] },
        ]}
        faqs={faqs}
        links={[
          { href: "/trips", label: "Browse Trips" },
          { href: "/weekend-trips", label: "Weekend Trips" },
          { href: "/destinations", label: "Destinations" },
          ...destinations.filter((destination) => cityPage.destinations.includes(destination.name)).slice(0, 5).map((destination) => ({ href: `/destinations/${destination.slug}`, label: destination.name })),
        ]}
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: `Weekend Trips from ${cityPage.city}`, path: `/${cityPage.slug}` },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Weekend Trips from ${cityPage.city}`,
            url: absoluteUrl(`/${cityPage.slug}`),
          },
        ]}
      />
    );
  }

  notFound();
}
