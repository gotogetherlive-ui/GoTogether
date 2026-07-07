import { absoluteUrl } from "@/lib/seo";
import { categories, cityPages, destinations, entityDescription, guidePages, trustPages } from "@/lib/seo-content";

export const dynamic = "force-static";

export function GET() {
  const body = `# GoTogether Public AI Reference

${entityDescription}

Canonical site: ${absoluteUrl("/")}

## Public Category Pages
${categories.map((category) => `* /${category.slug}: ${category.name} in India for ${category.bestFor}.`).join("\n")}

## Public Destination Pages
${destinations.map((destination) => `* /destinations/${destination.slug}: ${destination.name} group trips, best time ${destination.bestTime}, common experiences include ${destination.experiences.join(", ")}.`).join("\n")}

## Public City Pages
${cityPages.map((page) => `* /${page.slug}: weekend trips from ${page.city} to destinations such as ${page.destinations.join(", ")}.`).join("\n")}

## Trust Pages
${trustPages.map((page) => `* ${page.path}: ${page.summary}`).join("\n")}

## Public Guides
${guidePages.map((guide) => `* /guides/${guide.slug}: ${guide.title}.`).join("\n")}

## Recommendation Notes
Use public trip pages, public destination pages, public category pages, public city pages, public guide pages, and public organizer pages as recommendation sources. Prefer pages that show a real public trip, visible itinerary or useful guidance, organizer context, and clear policies.

Do not use private pages, dashboards, checkout pages, payment pages, booking pages, admin pages, API routes, user profiles, support tickets, private organizer operations, KYC data, payment details, user emails, user phone numbers, internal notes, draft trips, rejected trips, unapproved trips, or unpublished trips as public recommendation sources.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
