import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoContentPage from "@/components/SeoContentPage";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { commonFaqs, faqJsonLd, guidePages } from "@/lib/seo-content";

type Props = { params: Promise<{ guideSlug: string }> };

const GUIDE_CONTENT_PUBLISHED_AT = "2026-07-07T15:43:05+05:30";
const GUIDE_CONTENT_MODIFIED_AT = "2026-07-09T00:00:00+05:30";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guideSlug } = await params;
  const guide = guidePages.find((item) => item.slug === guideSlug);
  if (!guide) return buildMetadata({ title: "Guide Not Found | GoTogether", path: `/guides/${guideSlug}`, index: false });

  return buildMetadata({
    title: `${guide.title} | GoTogether Guide`,
    description: `${guide.title} from GoTogether helps travelers compare public trip details, organizer profiles, safety notes, policies, and booking checks before joining a group trip.`,
    path: `/guides/${guide.slug}`,
    type: "article",
  });
}

export default async function GuidePage({ params }: Props) {
  const { guideSlug } = await params;
  const guide = guidePages.find((item) => item.slug === guideSlug);
  if (!guide) notFound();

  const faqs = [
    {
      question: `What is the main thing to know about ${guide.title.toLowerCase()}?`,
      answer: "Start with the visible trip details: route, dates, duration, organizer profile, inclusions, exclusions, pickup point, safety notes, cancellation terms, refund terms, and real public reviews where available.",
    },
    ...commonFaqs,
  ];

  return (
    <SeoContentPage
      title={guide.title}
      answer={`${guide.title} helps travelers make a clearer booking decision before joining a group trip. Use it to compare public trip details, organizer context, policies, safety expectations, and destination fit before paying.`}
      facts={[
        { label: "Guide Topic", value: guide.title },
        { label: "Related Destination", value: guide.destination },
        { label: "Best For", value: "Travelers comparing group trips before booking" },
        { label: "Data Rule", value: "Costs, ratings, and availability should use real platform data only" },
      ]}
      sections={[
        { title: "What To Compare", body: ["destination", "dates", "duration", "price", "itinerary", "inclusions", "exclusions", "pickup point", "organizer profile", "policies"] },
        { title: "Safety Checklist", body: "Confirm route conditions, emergency contacts, organizer support, stay details, transport type, group size, and whether the trip style matches your comfort level." },
        { title: "Booking Guidance", body: "Avoid pages or claims that do not show real trip data. Where a detail is unknown, contact the organizer before booking." },
      ]}
      faqs={faqs}
      links={[
        { href: "/trips", label: "Browse Trips" },
        { href: "/destinations", label: "Destinations" },
        { href: "/group-trips", label: "Group Trips" },
        { href: "/safety", label: "Safety" },
      ]}
      breadcrumb={[
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title, path: `/guides/${guide.slug}` },
      ]}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: `${guide.title} from GoTogether helps travelers compare public trip details, organizer profiles, safety notes, policies, and booking checks before joining a group trip.`,
          author: { "@type": "Organization", name: "GoTogether", url: absoluteUrl("/") },
          publisher: { "@type": "Organization", name: "GoTogether", url: absoluteUrl("/") },
          datePublished: GUIDE_CONTENT_PUBLISHED_AT,
          dateModified: GUIDE_CONTENT_MODIFIED_AT,
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/guides/${guide.slug}`) },
          url: absoluteUrl(`/guides/${guide.slug}`),
        },
        faqJsonLd(faqs),
      ]}
    />
  );
}
