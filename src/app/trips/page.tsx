import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { query, queryOne } from '@/lib/db';
import TripsClient from "./TripsClient";
import type { TripSummary } from "@/components/TripCard";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";
import Page3DWrapper from "@/components/Page3DWrapper";
import FadeInScroll from "@/components/FadeInScroll";

export const dynamic = "force-dynamic";

const TRIPS_PER_PAGE = 24;

type Props = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function parsePage(value?: string | string[]): number {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function tripsPageHref(page: number): string {
  return page <= 1 ? "/trips" : `/trips?page=${page}`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  return buildMetadata({
    title: page > 1 ? `Verified Group Trips in India - Page ${page} | GoTogether` : "Verified Group Trips in India | GoTogether",
    description: "Discover verified group trips, backpacking trips, weekend trips, trekking trips, bike trips, and curated travel experiences in India on GoTogether.",
    path: tripsPageHref(page),
  });
}

export default async function FindTripPage({ searchParams }: Props) {
  let dataUnavailable = false;
  let trips: TripSummary[] = [];
  let totalTrips = 0;
  const requestedPage = parsePage((await searchParams).page);
  let currentPage = requestedPage;

  try {
    const countRow = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.status = 'live' AND t.trip_type = 'premium'
        AND t.deleted_at IS NULL AND u.deleted_at IS NULL
    `, []);
    totalTrips = Number(countRow?.count || 0);
    const totalPages = Math.max(1, Math.ceil(totalTrips / TRIPS_PER_PAGE));
    if (requestedPage > totalPages) permanentRedirect(tripsPageHref(totalPages));
    currentPage = Math.min(requestedPage, totalPages);

    const rows = await query<TripSummary>(`
    SELECT 
      t.id, t.slug, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.is_featured, t.tags, t.brochure_url, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.registration_closed,
      u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar, u.organizer_slug
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.status = 'live' AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL AND u.deleted_at IS NULL
    ORDER BY t.is_featured DESC, t.created_at DESC
    LIMIT $1 OFFSET $2
    `, [TRIPS_PER_PAGE, (currentPage - 1) * TRIPS_PER_PAGE]);
    trips = await Promise.all(rows.map(async (trip) => ({ ...trip, slug: await ensureTripSlug(trip), organizer_slug: await ensureOrganizerSlug({ id: trip.organizer_id || "", full_name: trip.organizer_name, organizer_slug: trip.organizer_slug }) })));
  } catch (error) {
    dataUnavailable = true;
    console.error("Failed to load public trips", error);
  }

  const totalPages = Math.max(1, Math.ceil(totalTrips / TRIPS_PER_PAGE));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      
      <Page3DWrapper className="flex-1 flex flex-col">
        <main className="flex-1 pt-28 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <FadeInScroll delay={0}>
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                Curated Adventures
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Discover premium trips organized by verified businesses and admins. Guaranteed safety, quality, and unforgettable experiences.
              </p>
            </div>
          </FadeInScroll>

          <FadeInScroll delay={0.2}>
            {dataUnavailable && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
                Trips are temporarily unavailable. Please try again shortly.
              </div>
            )}
            <TripsClient initialTrips={trips} />
            {totalPages > 1 && (
              <nav aria-label="Trip results pages" className="mt-12 flex items-center justify-center gap-4">
                {currentPage > 1 ? (
                  <Link rel="prev" href={tripsPageHref(currentPage - 1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600">
                    Previous
                  </Link>
                ) : <span />}
                <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                {currentPage < totalPages ? (
                  <Link rel="next" href={tripsPageHref(currentPage + 1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600">
                    Next
                  </Link>
                ) : <span />}
              </nav>
            )}
          </FadeInScroll>
        </main>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}





