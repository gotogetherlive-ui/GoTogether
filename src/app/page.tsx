import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Compass, UsersRound, MapPinned } from "lucide-react";
import HeroSlideshow from "@/components/HeroSlideshow";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripCard, { type TripSummary } from "@/components/TripCard";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import HomeSeoContent from "@/components/HomeSeoContent";
import DestinationPreviewCard from "@/components/DestinationPreviewCard";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";
import { query } from '@/lib/db';
import { ensureTripSlug } from '@/lib/slugs';
import { ensureOrganizerSlug } from '@/lib/organizer-slugs';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';

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
    WHERE t.status = 'live' AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL AND u.deleted_at IS NULL
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
      <div className="gt-editorial min-h-screen bg-slate-50 text-slate-900">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Navbar />
        <main className="overflow-x-clip">
          <section className="gt-immersive-hero">
            <HeroSlideshow />
            <div className="gt-container relative z-10 pointer-events-none">
              <ScrollReveal className="gt-hero-copy max-w-3xl pointer-events-auto" delay={120}>
                <h1 className="text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">Don&apos;t just travel.<br /><span className="text-orange-400">GoTogether.</span></h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-white/85 sm:text-lg">A custom trip built around you. A travel buddy who shares your plans. Find your favourite way to explore, together.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/custom-trip" className="gt-glossy-button gt-hero-action gt-hero-action-primary"><MapPinned className="h-5 w-5" />Plan a Custom Trip<ArrowUpRight className="h-4 w-4" /></Link>
                  <Link href="/buddy" className="gt-glossy-button gt-gold-sweep gt-hero-action gt-hero-action-secondary"><UsersRound className="h-5 w-5" />Find a Travel Buddy<ArrowUpRight className="h-4 w-4" /></Link>
                </div>
                <Link href="/trips" className="mt-6 inline-flex items-center gap-3 border-b border-white/50 pb-1 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200">Or explore group trips <ArrowRight className="h-4 w-4" /></Link>
              </ScrollReveal>
            </div>
          </section>
          <section className="gt-container" aria-label="Ways to travel">
            <ScrollReveal className="gt-travel-routes" stagger>
              {[{ n: '01', title: 'Join a group trip', text: 'Compare itineraries, dates, and organizers.', href: '/trips' }, { n: '02', title: 'Find your people', text: 'Connect over where you want to go next.', href: '/buddy' }, { n: '03', title: 'Make it your own', text: 'A personal itinerary, built around you.', href: '/custom-trip' }].map(item => <Link key={item.n} href={item.href} className="gt-card-lift group flex gap-5 py-7"><span className="pt-1 text-xs text-orange-700">{item.n}</span><div className="flex-1"><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p></div><ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-orange-700" /></Link>)}
            </ScrollReveal>
          </section>
          <section className="gt-container gt-section">
            <ScrollReveal className="gt-section-heading"><div><p className="gt-eyebrow">Where to next?</p><h2 className="gt-title">Follow your curiosity.</h2></div><Link href="/destinations" className="gt-text-link">Explore destinations <ArrowRight className="h-4 w-4" /></Link></ScrollReveal>
            <ScrollReveal className="flex snap-x gap-5 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:overflow-visible" delay={100} stagger>
              {[
                { name: 'The mountains', place: 'Ladakh', image: 'ladakh', note: 'High passes. Wide open skies.', videos: [
                  { label: 'Aerial' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/07/Pangong_Tso_and_Tso_Moriri_Lake_Drone_Video.webm/Pangong_Tso_and_Tso_Moriri_Lake_Drone_Video.webm.480p.vp9.webm' },
                  { label: 'Ground' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4e/Panorama_from_Basgo_monastery%2C_Ladakh.webm/Panorama_from_Basgo_monastery%2C_Ladakh.webm.480p.vp9.webm' },
                ] },
                { name: 'The slow life', place: 'Kerala', image: 'kerala', note: 'Backwaters and a different pace.', videos: [
                  { label: 'Aerial' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Landscape_view_of_Kochi_from_an_aircraft.webm/Landscape_view_of_Kochi_from_an_aircraft.webm.480p.vp9.webm' },
                  { label: 'Ground' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/9/9a/Kerala_-_India%27s_Paradise_Found.webm/Kerala_-_India%27s_Paradise_Found.webm.480p.vp9.webm' },
                ] },
                { name: 'The coast', place: 'Goa', image: 'goa', note: 'Salt air and unhurried afternoons.', videos: [
                  { label: 'Aerial' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/66/Layers_of_clouds_as_seen_from_a_flight_window_while_flying_over_Zuari_River%2C_Goa.webm/Layers_of_clouds_as_seen_from_a_flight_window_while_flying_over_Zuari_River%2C_Goa.webm.480p.vp9.webm' },
                  { label: 'Ground' as const, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Aguada_beach%2C_Goa.webm/Aguada_beach%2C_Goa.webm.480p.vp9.webm' },
                ] },
              ].map(item => <DestinationPreviewCard key={item.place} {...item} />)}
            </ScrollReveal>
            <p className="mt-3 text-[10px] leading-5 text-slate-400">
              Preview footage via Wikimedia Commons: Ladakh by <a className="underline underline-offset-2 hover:text-slate-600" href="https://commons.wikimedia.org/wiki/File:Pangong_Tso_and_Tso_Moriri_Lake_Drone_Video.webm" target="_blank" rel="noreferrer">Knowledge of India</a> and <a className="underline underline-offset-2 hover:text-slate-600" href="https://commons.wikimedia.org/wiki/File:Panorama_from_Basgo_monastery,_Ladakh.webm" target="_blank" rel="noreferrer">Yann Forget</a>; Kerala by <a className="underline underline-offset-2 hover:text-slate-600" href="https://commons.wikimedia.org/wiki/File:Landscape_view_of_Kochi_from_an_aircraft.webm" target="_blank" rel="noreferrer">Jinoy Tom Jacob</a> and <a className="underline underline-offset-2 hover:text-slate-600" href="https://commons.wikimedia.org/wiki/File:Kerala_-_India%27s_Paradise_Found.webm" target="_blank" rel="noreferrer">Incredible India</a>; Goa by <a className="underline underline-offset-2 hover:text-slate-600" href="https://commons.wikimedia.org/wiki/File:Layers_of_clouds_as_seen_from_a_flight_window_while_flying_over_Zuari_River,_Goa.webm" target="_blank" rel="noreferrer">Subhashish Panigrahi</a> (CC BY/CC BY-SA).
            </p>
          </section>
          <section className="border-y border-slate-200 bg-white">
            <div className="gt-container gt-section">
              <ScrollReveal className="gt-section-heading"><div><p className="gt-eyebrow">Ready when you are</p><h2 className="gt-title">Your next shared adventure.</h2></div><Link href="/trips" className="gt-text-link">View all trips <ArrowRight className="h-4 w-4" /></Link></ScrollReveal>
              <ScrollReveal className="grid gap-6 md:grid-cols-3" delay={100} stagger>
                {topTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                <div className={`flex flex-col justify-center rounded-lg bg-slate-100 p-8 md:p-10 ${topTrips.length === 0 ? 'md:col-span-3 md:flex-row md:items-center md:justify-between md:gap-12' : ''}`}><div><Compass className="mb-6 h-7 w-7 text-orange-700" /><h3 className="font-serif text-3xl leading-tight">A trip that feels<br />like you.</h3><p className="mt-4 max-w-md text-sm leading-7 text-slate-600">Have a destination in mind? Tell us your dates, budget, and who’s coming. We’ll help you plan the details.</p></div><Link href="/custom-trip" className="gt-text-link mt-7 shrink-0">Plan a custom trip <ArrowRight className="h-4 w-4" /></Link></div>
              </ScrollReveal>
            </div>
          </section>
          <section className="gt-container gt-section">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <ScrollReveal className="relative aspect-[5/4] overflow-hidden rounded-lg" variant="image"><Image src="/hero_india_munnar.png" alt="Rolling green tea plantations in Munnar" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></ScrollReveal>
              <ScrollReveal variant="right" delay={120}><p className="gt-eyebrow">The people make the journey</p><h2 className="gt-title">Arrive as strangers.<br /><em>Leave with stories.</em></h2><p className="mt-6 text-base leading-8 text-slate-600">Some of the best parts of travel never make it onto an itinerary. A conversation on the road. A shared meal. Someone who sees the same place a little differently.</p><p className="mt-4 text-base leading-8 text-slate-600">Meet travelers, share your experiences, and find a reason to go again.</p><Link href="/stories" className="gt-text-link mt-7">Stories from the community <ArrowRight className="h-4 w-4" /></Link></ScrollReveal>
            </div>
          </section>
          <HomeSeoContent />
        </main>
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}
