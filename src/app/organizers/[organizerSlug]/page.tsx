import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import TripCard, { type TripSummary } from "@/components/TripCard";
import { query, queryOne } from "@/lib/db";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { commonFaqs, faqJsonLd } from "@/lib/seo-content";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";
import { ensureTripSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ organizerSlug: string }> };

type PublicOrganizer = {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string | null;
  organizer_slug?: string | null;
};

function looksLikeOrganizerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const publicOrganizerWhere = `
  u.deleted_at IS NULL
  AND u.role IN ('business', 'super_admin')
  AND EXISTS (
    SELECT 1
    FROM trips public_trip
    WHERE public_trip.organizer_id = u.id
      AND public_trip.status = 'live'
      AND public_trip.trip_type = 'premium'
      AND public_trip.deleted_at IS NULL
  )
`;

async function getPublicOrganizerById(id: string): Promise<PublicOrganizer | null> {
  return queryOne<PublicOrganizer>(`
    SELECT u.id, u.full_name, u.role, u.avatar_url, u.created_at, u.organizer_slug
    FROM users u
    WHERE u.id = $1
      AND ${publicOrganizerWhere}
  `, [id]);
}

async function getPublicOrganizerBySlug(slug: string): Promise<PublicOrganizer | null> {
  return queryOne<PublicOrganizer>(`
    SELECT u.id, u.full_name, u.role, u.avatar_url, u.created_at, u.organizer_slug
    FROM users u
    WHERE u.organizer_slug = $1
      AND ${publicOrganizerWhere}
  `, [slug]);
}

async function getPublicOrganizerByOldSlug(slug: string): Promise<PublicOrganizer | null> {
  return queryOne<PublicOrganizer>(`
    SELECT u.id, u.full_name, u.role, u.avatar_url, u.created_at, u.organizer_slug
    FROM public.organizer_slug_history h
    JOIN users u ON h.organizer_id = u.id
    WHERE h.old_slug = $1
      AND ${publicOrganizerWhere}
  `, [slug]);
}

async function resolvePublicOrganizer(candidate: string): Promise<{ organizer: PublicOrganizer; canonicalSlug: string; shouldRedirect: boolean } | null> {
  if (looksLikeOrganizerId(candidate)) {
    const organizer = await getPublicOrganizerById(candidate);
    if (!organizer) return null;
    const canonicalSlug = await ensureOrganizerSlug(organizer);
    return { organizer, canonicalSlug, shouldRedirect: true };
  }

  const current = await getPublicOrganizerBySlug(candidate);
  if (current) {
    const canonicalSlug = await ensureOrganizerSlug(current);
    return { organizer: current, canonicalSlug, shouldRedirect: candidate !== canonicalSlug };
  }

  const historical = await getPublicOrganizerByOldSlug(candidate);
  if (!historical) return null;
  const canonicalSlug = await ensureOrganizerSlug(historical);
  return { organizer: historical, canonicalSlug, shouldRedirect: true };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizerSlug } = await params;
  const resolved = await resolvePublicOrganizer(organizerSlug).catch(() => null);
  const organizer = resolved?.organizer;

  if (!organizer || !resolved) {
    return buildMetadata({ title: "Organizer Not Found | GoTogether", path: `/organizers/${organizerSlug}`, index: false });
  }

  const organizerName = organizer.full_name || "Organizer";
  return buildMetadata({
    title: `${organizerName} Trips | Verified Travel Organizer on GoTogether`,
    description: `View ${organizerName} trips on GoTogether. Compare upcoming group trips, destinations, prices, itineraries, reviews, policies, and verified organizer details.`,
    path: `/organizers/${resolved.canonicalSlug}`,
    image: organizer.avatar_url || undefined,
  });
}

export default async function OrganizerPage({ params }: Props) {
  const { organizerSlug } = await params;
  const resolved = await resolvePublicOrganizer(organizerSlug);

  if (!resolved) notFound();
  if (resolved.shouldRedirect) permanentRedirect(`/organizers/${resolved.canonicalSlug}`);

  const { organizer, canonicalSlug } = resolved;
  const tripRows = await query<TripSummary>(
    `SELECT t.id, t.slug, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.is_featured, t.tags, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.registration_closed,
            u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar, u.organizer_slug
     FROM trips t
     JOIN users u ON t.organizer_id = u.id
     WHERE t.organizer_id = $1 AND t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
     ORDER BY t.is_featured DESC, t.created_at DESC
     LIMIT 50`,
    [organizer.id],
  );
  const trips = await Promise.all(tripRows.map(async (trip) => ({ ...trip, slug: await ensureTripSlug(trip), organizer_slug: canonicalSlug })));

  const destinations = Array.from(new Set(trips.map((trip) => trip.destination).filter(Boolean)));
  const faqs = [
    {
      question: `Does this page show only ${organizer.full_name || "the organizer"} trips?`,
      answer: "Yes. The owned trip list is filtered by organizer ownership and only includes this organizer's live public trips.",
    },
    ...commonFaqs,
  ];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${organizer.full_name || "Verified Organizer"} public trips`,
    itemListElement: trips.map((trip, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/trips/${trip.slug}`),
      name: trip.title,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Organizers", path: "/organizers" }, { name: organizer.full_name || "Organizer", path: `/organizers/${canonicalSlug}` }])} />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": organizer.role === "business" ? "TravelAgency" : "Organization",
          name: organizer.full_name || "Verified Organizer",
          description: `Public GoTogether organizer profile for ${organizer.full_name || "this organizer"}, showing live public trips and destinations served.`,
          url: absoluteUrl(`/organizers/${canonicalSlug}`),
          logo: organizer.avatar_url || undefined,
          image: organizer.avatar_url || undefined,
          makesOffer: trips.map((trip) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "TouristTrip",
              name: trip.title,
              url: absoluteUrl(`/trips/${trip.slug}`),
              touristDestination: trip.destination ? { "@type": "TouristDestination", name: trip.destination } : undefined,
            },
          })),
        }}
      />
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <Link href="/organizers" className="text-sm font-semibold text-orange-600">All organizers</Link>
        <h1 className="text-4xl md:text-6xl font-extrabold mt-4 mb-5">{organizer.full_name || "Verified Organizer"}</h1>
        <p className="text-lg text-slate-600 max-w-4xl mb-8">
          This public organizer profile shows verified marketplace information and live trips owned by this organizer. It does not show payment account details, dashboard data, private bookings, internal notes, or unpublished trips.
        </p>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-10">
          <h2 className="text-2xl font-bold mb-4">Organizer Facts</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><dt className="text-xs uppercase font-bold text-slate-400">Verification Status</dt><dd className="font-semibold">Verified organizer profile</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Destinations Served</dt><dd className="font-semibold">{destinations.join(", ") || "Check upcoming trips"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Upcoming Public Trips</dt><dd className="font-semibold">{trips.length}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Cancellation/Refund Summary</dt><dd className="font-semibold">Review each trip policy before booking</dd></div>
          </dl>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-5">Upcoming Public Trips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-5">FAQs</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="bg-white border border-slate-200 rounded-xl p-5">
                <summary className="font-bold cursor-pointer">{faq.question}</summary>
                <p className="text-slate-600 mt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
