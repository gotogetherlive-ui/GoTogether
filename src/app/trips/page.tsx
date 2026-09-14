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
import { getAppSettings } from "@/lib/settings";
import { AsyncTtlCache } from "@/lib/asyncTtlCache";

import { parseTripBudget, TRIP_BUDGET_PRICE_SQL } from "@/lib/tripBudget";

export const dynamic = "force-dynamic";

const TRIPS_PER_PAGE = 24;
const tripsPageCache = new AsyncTtlCache<string, { trips: TripSummary[]; totalTrips: number }>(15_000, 100);

type Props = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[]; date?: string | string[]; duration?: string | string[]; minBudget?: string | string[]; maxBudget?: string | string[] }>;
};

function isInvalidSearchTemplate(value?: string | string[]): boolean {
  const query = Array.isArray(value) ? value[0] : value;
  return query === "{search_term_string}";
}

function parsePage(value?: string | string[]): number {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function tripsPageHref(page: number, search = "", date = "", duration = "", minBudget = "", maxBudget = ""): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("q", search);
  if (date) params.set("date", date);
  if (duration) params.set("duration", duration);
  if (minBudget) params.set("minBudget", minBudget);
  if (maxBudget) params.set("maxBudget", maxBudget);
  return params.size ? `/trips?${params}` : "/trips";
}

async function loadTripsPage(
  page: number,
  searchQuery: string,
  filterDate: string,
  filterDuration: string,
  minBudget: string,
  maxBudget: string,
): Promise<{ trips: TripSummary[]; totalTrips: number }> {
  const cacheKey = JSON.stringify([page, searchQuery.toLocaleLowerCase("en-IN"), filterDate, filterDuration, minBudget, maxBudget]);
  return tripsPageCache.get(cacheKey, async () => {
    const [countRow, rows] = await Promise.all([
      queryOne<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM trips t
        JOIN users u ON t.organizer_id = u.id
        WHERE t.status = 'live' AND t.trip_type = 'premium'
          AND t.deleted_at IS NULL AND u.deleted_at IS NULL
          AND ($1 = '' OR t.destination ILIKE $2 OR t.title ILIKE $2 OR t.pickup_point ILIKE $2)
          AND ($3 = '' OR LEFT(t.start_date, 10) = $3)
          AND ($4 = '' OR ($4 = '1-3' AND t.duration_days BETWEEN 1 AND 3) OR ($4 = '4-7' AND t.duration_days BETWEEN 4 AND 7) OR ($4 = '8+' AND t.duration_days >= 8))
          AND ($5::numeric IS NULL OR ${TRIP_BUDGET_PRICE_SQL} >= $5::numeric)
          AND ($6::numeric IS NULL OR ${TRIP_BUDGET_PRICE_SQL} <= $6::numeric)
      `, [searchQuery, `%${searchQuery}%`, filterDate, filterDuration, minBudget || null, maxBudget || null]),
      query<TripSummary>(`
        SELECT
          t.id, t.slug, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.is_featured, t.tags, t.brochure_url, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.registration_closed,
          u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar, u.organizer_slug
        FROM trips t
        JOIN users u ON t.organizer_id = u.id
        WHERE t.status = 'live' AND t.trip_type = 'premium'
          AND t.deleted_at IS NULL AND u.deleted_at IS NULL
          AND ($3 = '' OR t.destination ILIKE $4 OR t.title ILIKE $4 OR t.pickup_point ILIKE $4)
          AND ($5 = '' OR LEFT(t.start_date, 10) = $5)
          AND ($6 = '' OR ($6 = '1-3' AND t.duration_days BETWEEN 1 AND 3) OR ($6 = '4-7' AND t.duration_days BETWEEN 4 AND 7) OR ($6 = '8+' AND t.duration_days >= 8))
          AND ($7::numeric IS NULL OR ${TRIP_BUDGET_PRICE_SQL} >= $7::numeric)
          AND ($8::numeric IS NULL OR ${TRIP_BUDGET_PRICE_SQL} <= $8::numeric)
        ORDER BY t.is_featured DESC, t.created_at DESC
        LIMIT $1 OFFSET $2
      `, [TRIPS_PER_PAGE, (page - 1) * TRIPS_PER_PAGE, searchQuery, `%${searchQuery}%`, filterDate, filterDuration, minBudget || null, maxBudget || null]),
    ]);

    const trips = await Promise.all(rows.map(async (trip) => ({
      ...trip,
      slug: await ensureTripSlug(trip),
      organizer_slug: await ensureOrganizerSlug({
        id: trip.organizer_id || "",
        full_name: trip.organizer_name,
        organizer_slug: trip.organizer_slug,
      }),
    })));

    return { trips, totalTrips: Number(countRow?.count || 0) };
  });
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
  const resolvedSearchParams = await searchParams;
  if (isInvalidSearchTemplate(resolvedSearchParams.q)) permanentRedirect("/trips");
  const searchQuery = (Array.isArray(resolvedSearchParams.q) ? resolvedSearchParams.q[0] : resolvedSearchParams.q || "").trim().slice(0, 200);
  const dateParam = Array.isArray(resolvedSearchParams.date) ? resolvedSearchParams.date[0] : resolvedSearchParams.date || "";
  const filterDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : "";
  const durationParam = Array.isArray(resolvedSearchParams.duration) ? resolvedSearchParams.duration[0] : resolvedSearchParams.duration || "";
  const filterDuration = ["1-3", "4-7", "8+"].includes(durationParam) ? durationParam : "";
  const minBudget = parseTripBudget(resolvedSearchParams.minBudget);
  const maxBudget = parseTripBudget(resolvedSearchParams.maxBudget);
  const requestedPage = parsePage(resolvedSearchParams.page);
  let currentPage = requestedPage;
  let redirectPage: number | null = null;
  const settingsPromise = getAppSettings();

  try {
    const result = await loadTripsPage(requestedPage, searchQuery, filterDate, filterDuration, minBudget, maxBudget);
    totalTrips = result.totalTrips;
    const totalPages = Math.max(1, Math.ceil(totalTrips / TRIPS_PER_PAGE));
    if (requestedPage > totalPages) redirectPage = totalPages;
    currentPage = Math.min(requestedPage, totalPages);
    trips = result.trips;
  } catch (error) {
    dataUnavailable = true;
    console.error("Failed to load public trips", error);
  }

  if (redirectPage !== null) permanentRedirect(tripsPageHref(redirectPage, searchQuery, filterDate, filterDuration, minBudget, maxBudget));
  const settings = await settingsPromise;

  const totalPages = Math.max(1, Math.ceil(totalTrips / TRIPS_PER_PAGE));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      
      <Page3DWrapper className="flex-1 flex flex-col">
        <main className="flex-1 pt-28 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <FadeInScroll delay={0}>
            <div className="mb-10 border-b border-slate-200 pb-9">
              <h1 className="gt-page-title text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Find your next adventure.
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl">
                Compare destinations, itineraries, and organizers. Find a group trip that fits the way you like to travel.
              </p>
            </div>
          </FadeInScroll>

          <FadeInScroll delay={0.2}>
            <TripsClient
              key={JSON.stringify([searchQuery, filterDate, filterDuration, minBudget, maxBudget, currentPage])}
              initialTrips={trips}
              initialSearchQuery={searchQuery}
              initialDate={filterDate}
              initialDuration={filterDuration}
              initialMinBudget={minBudget}
              initialMaxBudget={maxBudget}
              emptyStateTitle={settings.trips_empty_title}
              emptyStateMessage={settings.trips_empty_message}
              dataUnavailable={dataUnavailable}
            />
            {totalPages > 1 && (
              <nav aria-label="Trip results pages" className="mt-12 flex items-center justify-center gap-4">
                {currentPage > 1 ? (
                  <Link rel="prev" href={tripsPageHref(currentPage - 1, searchQuery, filterDate, filterDuration, minBudget, maxBudget)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600">
                    Previous
                  </Link>
                ) : <span />}
                <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                {currentPage < totalPages ? (
                  <Link rel="next" href={tripsPageHref(currentPage + 1, searchQuery, filterDate, filterDuration, minBudget, maxBudget)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600">
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





