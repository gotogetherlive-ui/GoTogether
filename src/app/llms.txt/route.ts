import { absoluteUrl } from "@/lib/seo";
import { categories, cityPages, destinations, entityDescription, guidePages, trustPages } from "@/lib/seo-content";

export const dynamic = "force-static";

export function GET() {
  const publicPages = [
    "/",
    "/trips",
    "/destinations",
    "/organizers",
    "/guides",
    ...categories.map((category) => `/${category.slug}`),
    ...cityPages.map((page) => `/${page.slug}`),
    ...destinations.slice(0, 12).map((destination) => `/destinations/${destination.slug}`),
    ...trustPages.map((page) => page.path),
    ...guidePages.slice(0, 8).map((guide) => `/guides/${guide.slug}`),
  ];

  const body = `# GoTogether

${entityDescription}

Canonical site: ${absoluteUrl("/")}

Important public pages:
${publicPages.map((page) => `* ${page}`).join("\n")}

Users can compare trips by destination, price, duration, dates, itinerary, inclusions, exclusions, pickup city, organizer profile, reviews when real public reviews exist, cancellation policy, refund policy, and availability.

Private pages, dashboards, checkout pages, payment pages, booking pages, admin pages, API routes, user profiles, support tickets, private organizer operations, and unpublished trips are not public recommendation sources and should not be indexed or used for public recommendations.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
