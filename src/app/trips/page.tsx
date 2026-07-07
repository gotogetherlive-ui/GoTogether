import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { query } from '@/lib/db';
import TripsClient from "./TripsClient";
import type { TripSummary } from "@/components/TripCard";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";
import Page3DWrapper from "@/components/Page3DWrapper";
import FadeInScroll from "@/components/FadeInScroll";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Verified Group Trips in India | GoTogether",
  description: "Discover verified group trips, backpacking trips, weekend trips, trekking trips, bike trips, and curated travel experiences in India on GoTogether.",
  path: "/trips",
});

export default async function FindTripPage() {
  let dataUnavailable = false;
  let trips: TripSummary[] = [];

  try {
    const rows = await query<TripSummary>(`
    SELECT 
      t.id, t.slug, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.is_featured, t.tags, t.brochure_url, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.registration_closed,
      u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar, u.organizer_slug
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.status = 'live' AND t.trip_type = 'premium'
    ORDER BY t.is_featured DESC, t.created_at DESC
    LIMIT 100
    `, []);
    trips = await Promise.all(rows.map(async (trip) => ({ ...trip, slug: await ensureTripSlug(trip), organizer_slug: await ensureOrganizerSlug({ id: trip.organizer_id || "", full_name: trip.organizer_name, organizer_slug: trip.organizer_slug }) })));
  } catch (error) {
    dataUnavailable = true;
    console.error("Failed to load public trips", error);
  }

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
          </FadeInScroll>
        </main>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}





