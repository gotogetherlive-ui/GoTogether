import Link from "next/link";
import { Users, ShieldCheck, ChevronRight, Compass } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSlideshow from "@/components/HeroSlideshow";
import HeroFindBuddyButton from "@/components/HeroFindBuddyButton";
import HeroGreeting from "@/components/HeroGreeting";
import TripCard, { type TripSummary } from "@/components/TripCard";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import FadeInScroll from "@/components/FadeInScroll";
import TiltWrapper from "@/components/TiltWrapper";
import AnimatedButton from "@/components/AnimatedButton";
import Animated3DText from "@/components/Animated3DText";
import HomeSeoContent from "@/components/HomeSeoContent";
import { query } from '@/lib/db';
import { ensureTripSlug } from '@/lib/slugs';
import { ensureOrganizerSlug } from '@/lib/organizer-slugs';

export const dynamic = "force-dynamic";

const TOP_TRIPS_CACHE_MS = 30_000;
let topTripsCache: { trips: TripSummary[]; expiresAt: number } | null = null;
let topTripsRequest: Promise<TripSummary[]> | null = null;

async function loadTopTrips(): Promise<TripSummary[]> {
  const topTripRows = await query<TripSummary>(`
    SELECT t.id, t.slug, t.title, t.description, t.destination, t.image_url, t.images, t.status, t.is_featured, t.trip_type, t.duration_days, t.duration_nights, t.start_date, t.pickup_point, t.drop_point, t.b2c_price, t.gotogether_price, t.tags,
           u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar, u.organizer_slug
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.status = 'live' AND (t.is_featured = 1 OR t.trip_type = 'business')
    ORDER BY t.is_featured DESC, t.created_at DESC
    LIMIT 2
  `, []);

  return Promise.all(topTripRows.map(async (trip) => ({
    ...trip,
    slug: await ensureTripSlug(trip),
    organizer_slug: await ensureOrganizerSlug({
      id: trip.organizer_id || "",
      full_name: trip.organizer_name,
      organizer_slug: trip.organizer_slug,
    }),
  })));
}

async function getTopTrips(): Promise<TripSummary[]> {
  const now = Date.now();
  if (topTripsCache && now < topTripsCache.expiresAt) return topTripsCache.trips;
  if (topTripsRequest) return topTripsRequest;

  topTripsRequest = loadTopTrips();
  try {
    const trips = await topTripsRequest;
    topTripsCache = { trips, expiresAt: Date.now() + TOP_TRIPS_CACHE_MS };
    return trips;
  } finally {
    topTripsRequest = null;
  }
}

export default async function Home() {
  let topTrips: TripSummary[] = [];

  try {
    topTrips = await getTopTrips();
  } catch (error) {
    console.error("Failed to load home top trips", error);
  }

  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Shared Navbar */}
        <Navbar />

        {/* Hero Section */}
        <section className="relative min-h-[100svh] px-0 pb-24 pt-28 md:min-h-[90vh] md:pb-24 md:pt-28 flex items-center justify-center overflow-hidden">
          {/* Auto-changing background slideshow */}
          <HeroSlideshow />

          <div className="relative z-10 text-center max-w-4xl px-6 flex flex-col items-center">
            <HeroGreeting />
            <h1 className="text-[2.65rem] sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.08] mb-5 md:mb-6 drop-shadow-lg">
              Don&apos;t just travel. <br />
              <Animated3DText delay={0.3}>
                <span className="text-orange-400 sm:text-transparent sm:bg-clip-text sm:bg-gradient-to-r sm:from-orange-400 sm:to-rose-400">
                  GoTogether.
                </span>
              </Animated3DText>
            </h1>
            <p className="text-base md:text-2xl text-slate-200 mb-8 md:mb-10 max-w-2xl drop-shadow">
              Connect with like-minded travelers, join verified trips, and create memories that last a lifetime.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <AnimatedButton
                href="/trips"
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full shadow-xl hover:shadow-orange-500/40 flex items-center justify-center gap-2"
              >
                Find a Trip
                <ChevronRight className="w-5 h-5" />
              </AnimatedButton>
              <HeroFindBuddyButton />
            </div>
          </div>

          {/* Decorative wave at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-20"></div>
        </section>

        {/* Featured / Top Trips Section */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
          <FadeInScroll delay={0}>
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Top Trips</h2>
                <p className="text-slate-600 text-lg">Handpicked adventures hosted by verified businesses and admins.</p>
              </div>
              <Link href="/trips" className="text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1 group">
                View all <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </FadeInScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dynamic Top Trips */}
            {topTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} linkToTrips />
            ))}

            {/* Trip Card 3 - CTA Card */}
            <FadeInScroll delay={0.4} className="h-full">
              <TiltWrapper className="h-full">
                <Link
                  href="/trips"
                  aria-label="Browse all trips"
                  className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 transition-all flex flex-col items-center justify-center p-8 text-center text-white min-h-[400px] h-full relative group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <Compass className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 transform group-hover:translate-y-[-5px] transition-transform duration-500">
                    Ready to explore?
                  </h3>
                  <p className="text-white/80 mb-8 max-w-xs transform group-hover:translate-y-[-5px] transition-transform duration-500 delay-75">
                    Compare live verified trips, transparent prices, organizers, and itineraries in one place.
                  </p>
                  <span className="bg-white text-orange-600 font-bold px-8 py-3 rounded-full shadow-xl group-hover:shadow-white/40 group-active:shadow-inner transition-shadow">
                    Browse All Trips
                  </span>
                </Link>
              </TiltWrapper>
            </FadeInScroll>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-24 border-y border-slate-200 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <FadeInScroll delay={0}>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why GoTogether?</h2>
                <p className="text-slate-600 text-lg">We&apos;ve built a platform that prioritizes safety, quality, and community.</p>
              </div>
            </FadeInScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <FadeInScroll delay={0.1}>
                <div className="flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-6 text-orange-500 transform group-hover:-translate-y-2 transition-transform duration-300">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Partners</h3>
                  <p className="text-slate-600">Every business is thoroughly vetted, and admins curate the best experiences for your safety.</p>
                </div>
              </FadeInScroll>

              <FadeInScroll delay={0.3}>
                <div className="flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-6 text-rose-500 transform group-hover:-translate-y-2 transition-transform duration-300">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className='text-xl font-bold text-slate-900 mb-3'>Connect Before You Join</h3>
                  <p className='text-slate-600'>Ask questions, review the organizer, and connect with the group before making a booking decision.</p>
                </div>
              </FadeInScroll>

              <FadeInScroll delay={0.5}>
                <div className="flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 text-blue-500 transform group-hover:-translate-y-2 transition-transform duration-300">
                    <Compass className="w-8 h-8" />
                  </div>
                  <h3 className='text-xl font-bold text-slate-900 mb-3'>Clear Trip Comparison</h3>
                  <p className='text-slate-600'>Compare dates, prices, itineraries, inclusions, policies, and organizer details with less guesswork.</p>
                </div>
              </FadeInScroll>
            </div>
          </div>
        </section>

        <HomeSeoContent />

        {/* Shared Footer */}
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}





