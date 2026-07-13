import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { queryOne } from '@/lib/db';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripDetailsClient from "./TripDetailsClient";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { commonFaqs, faqJsonLd } from "@/lib/seo-content";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";

export const dynamic = "force-dynamic";

type TripDetails = {
  id: string;
  title: string;
  description: string;
  destination: string;
  duration_days: number | string | null;
  duration_nights?: number | string | null;
  image_url?: string | null;
  images?: string | null;
  status: string;
  slug?: string | null;
  trip_type?: string | null;
  pickup_point?: string | null;
  drop_point?: string | null;
  b2b_price?: string | null;
  b2c_price?: string | null;
  gotogether_price?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  max_capacity?: number | null;
  registration_closed?: number | null;
  organizer_id: string;
  organizer_name?: string | null;
  organizer_slug?: string | null;
  organizer_role?: string | null;
  organizer_avatar?: string | null;
};

type Props = { params: Promise<{ tripSlug: string }>; searchParams?: Promise<{ booking_id?: string | string[] }> };

function parseImages(trip: Pick<TripDetails, "images" | "image_url">): string[] {
  if (trip.images) {
    try {
      const parsed = JSON.parse(trip.images);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string" && item.length > 0);
    } catch {
      // Fall back to cover image.
    }
  }
  return trip.image_url ? [trip.image_url] : [];
}

function priceText(trip: TripDetails): string | null {
  return trip.gotogether_price || trip.b2b_price || trip.b2c_price || null;
}

function numericPrice(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function tripEndDate(startDate: string | null, durationDays: number): string | null {
  if (!startDate || durationDays <= 0) return null;
  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + Math.max(durationDays - 1, 0));
  return date.toISOString().slice(0, 10);
}
async function getPublicTripById(id: string): Promise<TripDetails | null> {
  return queryOne<TripDetails>(`
    SELECT
      t.id, t.organizer_id, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.slug, t.trip_type, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.created_at, COALESCE((to_jsonb(t)->>'updated_at')::timestamptz, t.created_at) AS updated_at, t.max_capacity, t.registration_closed,
      u.full_name as organizer_name, u.organizer_slug, u.role as organizer_role, u.avatar_url as organizer_avatar
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.id = $1
      AND t.status = 'live'
      AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL
      AND u.deleted_at IS NULL
  `, [id]);
}

function looksLikeTripId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getPublicTripBySlug(slug: string): Promise<TripDetails | null> {
  return queryOne<TripDetails>(`
    SELECT
      t.id, t.organizer_id, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.slug, t.trip_type, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.created_at, COALESCE((to_jsonb(t)->>'updated_at')::timestamptz, t.created_at) AS updated_at, t.max_capacity, t.registration_closed,
      u.full_name as organizer_name, u.organizer_slug, u.role as organizer_role, u.avatar_url as organizer_avatar
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.slug = $1
      AND t.status = 'live'
      AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL
      AND u.deleted_at IS NULL
  `, [slug]);
}

async function getPublicTripByOldSlug(slug: string): Promise<TripDetails | null> {
  return queryOne<TripDetails>(`
    SELECT
      t.id, t.organizer_id, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.slug, t.trip_type, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.created_at, COALESCE((to_jsonb(t)->>'updated_at')::timestamptz, t.created_at) AS updated_at, t.max_capacity, t.registration_closed,
      u.full_name as organizer_name, u.organizer_slug, u.role as organizer_role, u.avatar_url as organizer_avatar
    FROM public.trip_slug_history h
    JOIN trips t ON h.trip_id = t.id
    JOIN users u ON t.organizer_id = u.id
    WHERE h.old_slug = $1
      AND t.status = 'live'
      AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL
      AND u.deleted_at IS NULL
  `, [slug]);
}

function tripDetailsPath(slug: string, query?: { booking_id?: string | string[] }): string {
  const bookingId = Array.isArray(query?.booking_id) ? query?.booking_id[0] : query?.booking_id;
  const params = new URLSearchParams();
  if (bookingId) params.set("booking_id", bookingId);
  const queryString = params.toString();
  return queryString ? `/trips/${slug}?${queryString}` : `/trips/${slug}`;
}

async function resolvePublicTrip(candidate: string): Promise<{ trip: TripDetails; canonicalSlug: string; shouldRedirect: boolean } | null> {
  if (looksLikeTripId(candidate)) {
    const trip = await getPublicTripById(candidate);
    if (!trip) return null;
    const canonicalSlug = await ensureTripSlug(trip);
    return { trip, canonicalSlug, shouldRedirect: true };
  }

  const current = await getPublicTripBySlug(candidate);
  if (current) {
    const canonicalSlug = await ensureTripSlug(current);
    return { trip: current, canonicalSlug, shouldRedirect: candidate !== canonicalSlug };
  }

  const historical = await getPublicTripByOldSlug(candidate);
  if (!historical) return null;
  const canonicalSlug = await ensureTripSlug(historical);
  return { trip: historical, canonicalSlug, shouldRedirect: true };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripSlug } = await params;
  const resolved = await resolvePublicTrip(tripSlug).catch(() => null);
  const trip = resolved?.trip;

  if (!trip || !resolved || !trip.title || !trip.description || !trip.destination || !parseImages(trip).length) {
    return buildMetadata({ title: "Trip Not Found | GoTogether", description: "This trip is not available for public indexing.", path: `/trips/${tripSlug}`, index: false });
  }

  const price = priceText(trip);
  const title = price ? `${trip.title} from ${price} | GoTogether` : `${trip.title} | Verified Group Trip on GoTogether`;

  return buildMetadata({
    title,
    description: `Book ${trip.title} with GoTogether. Explore ${trip.destination} with a verified organizer, detailed itinerary, transparent pricing, inclusions, exclusions, cancellation policy, and secure booking.`,
    path: `/trips/${resolved.canonicalSlug}`,
    image: parseImages(trip)[0],
  });
}

export default async function TripDetailsPage({ params, searchParams }: Props) {
  const { tripSlug } = await params;
  const resolved = await resolvePublicTrip(tripSlug);

  if (!resolved) {
    notFound();
  }

  if (resolved.shouldRedirect) {
    permanentRedirect(tripDetailsPath(resolved.canonicalSlug, await searchParams));
  }

  const { trip, canonicalSlug } = resolved;
  const organizerSlug = await ensureOrganizerSlug({ id: trip.organizer_id, full_name: trip.organizer_name, organizer_slug: trip.organizer_slug });

  const durationDays = Number(trip.duration_days || 0);
  const durationNights = Number(trip.duration_nights || 0);
  const formattedStartDate = trip.start_date
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(trip.start_date))
    : null;

  const imageList = parseImages(trip);
  const displayedPrice = priceText(trip);
  const offerPrice = numericPrice(displayedPrice);
  const startDate = isoDate(trip.start_date);
  const endDate = tripEndDate(startDate, durationDays);
  const tripDuration = durationDays > 0 ? `P${durationDays}D` : undefined;
  const faqs = [
    {
      question: `What is included in ${trip.title}?`,
      answer: "Review the trip overview, visible inclusions, exclusions, stay details, transport details, meal details, pickup/drop information, and organizer notes before booking. If a detail is missing, check with the organizer.",
    },
    {
      question: "Who owns this trip?",
      answer: `This public trip is owned by ${trip.organizer_name || "the listed organizer"}. GoTogether does not show another organizer's payment account, private inventory, dashboard data, or private status on this page.`,
    },
    ...commonFaqs,
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: trip.title,
    description: trip.description,
    image: imageList.length ? imageList : undefined,
    url: absoluteUrl(`/trips/${canonicalSlug}`),
    brand: { "@type": "Brand", name: "GoTogether" },
    category: trip.trip_type || "Group trip",
    offers: offerPrice
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: offerPrice,
          availability: trip.registration_closed ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          url: absoluteUrl(`/trips/${canonicalSlug}`),
          seller: { "@type": "Organization", name: trip.organizer_name || "Verified Organizer", url: absoluteUrl(`/organizers/${organizerSlug}`) },
        }
      : undefined,
  };

  const touristTripJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.title,
    description: trip.description,
    image: imageList.length ? imageList : undefined,
    url: absoluteUrl(`/trips/${canonicalSlug}`),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    duration: tripDuration,
    touristDestination: { "@type": "TouristDestination", name: trip.destination },
    touristType: "Group travelers",
    provider: {
      "@type": "Organization",
      name: trip.organizer_name || "Verified Organizer",
      url: absoluteUrl(`/organizers/${organizerSlug}`),
    },
    itinerary: {
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: trip.destination },
      ],
    },
    offers: offerPrice
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: offerPrice,
          availability: trip.registration_closed ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          url: absoluteUrl(`/trips/${canonicalSlug}`),
          seller: { "@type": "Organization", name: trip.organizer_name || "Verified Organizer", url: absoluteUrl(`/organizers/${organizerSlug}`) },
        }
      : undefined,
  };

  const tripView = {
    ...trip,
    duration_days: durationDays,
    duration_nights: durationNights,
    duration_label: `${durationDays} Days${durationNights ? ` / ${durationNights} Nights` : ""}`,
    formatted_start_date: formattedStartDate,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Trips", path: "/trips" }, { name: trip.title, path: `/trips/${canonicalSlug}` }])} />
      <JsonLd data={productJsonLd} />
      <JsonLd data={touristTripJsonLd} />
      <JsonLd data={faqJsonLd(faqs)} />
      <Navbar />
      <main className="flex-1 pt-28 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full space-y-8">
        <TripDetailsClient trip={tripView} />

        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Trip Facts</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><dt className="text-xs uppercase font-bold text-slate-400">Destination</dt><dd className="font-semibold">{trip.destination}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Duration</dt><dd className="font-semibold">{tripView.duration_label}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Dates</dt><dd className="font-semibold">{formattedStartDate || "Check with organizer"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Starting Price</dt><dd className="font-semibold">{displayedPrice || "Check with organizer"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Pickup Point</dt><dd className="font-semibold">{trip.pickup_point || "Check with organizer"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Organizer</dt><dd className="font-semibold"><Link className="text-orange-600" href={`/organizers/${organizerSlug}`}>{trip.organizer_name || "Verified Organizer"}</Link></dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Trip Type</dt><dd className="font-semibold">{trip.trip_type || "Group trip"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Availability</dt><dd className="font-semibold">{trip.registration_closed ? "Registration closed" : "Check live booking form"}</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Difficulty</dt><dd className="font-semibold">Check with organizer</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Best For</dt><dd className="font-semibold">Travelers who want an organizer-led group experience</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Cancellation Summary</dt><dd className="font-semibold">Review policy before booking</dd></div>
            <div><dt className="text-xs uppercase font-bold text-slate-400">Safety Notes</dt><dd className="font-semibold">Confirm route, stay, transport, and emergency expectations</dd></div>
          </dl>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Direct Answer</h2>
            <p className="text-slate-600 leading-relaxed">
              {trip.title} is a public GoTogether trip to {trip.destination} owned by {trip.organizer_name || "the listed organizer"}. Travelers should compare the itinerary, price, duration, dates, pickup/drop details, inclusions, exclusions, cancellation summary, refund summary, organizer profile, and safety notes before booking.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Best For</h3>
              <p className="text-slate-600">Travelers who want a verified organizer-led trip with public destination, duration, pricing, and booking details.</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Not Ideal For</h3>
              <p className="text-slate-600">Travelers who need private custom planning, unsupported age-specific claims, or details not provided by the organizer.</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">FAQs</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <summary className="font-bold cursor-pointer">{faq.question}</summary>
                <p className="text-slate-600 mt-3 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
