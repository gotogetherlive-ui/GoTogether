import { query } from "@/lib/db";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";
import type { TripSummary } from "@/components/TripCard";

type PublicTripLinkRow = {
  id: string;
  slug?: string | null;
  title: string;
  destination: string;
};

export type PublicTripLink = { href: string; label: string };

export async function getPublicTripLinks(destination?: string, limit = 6): Promise<PublicTripLink[]> {
  const destinationFilter = destination && destination.toLowerCase() !== "india";
  const rows = await query<PublicTripLinkRow>(`
    SELECT t.id, t.slug, t.title, t.destination
    FROM trips t
    JOIN users u ON u.id = t.organizer_id
    WHERE t.status = 'live' AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL AND u.deleted_at IS NULL
      AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
      AND ($1::text IS NULL OR LOWER(t.destination) = LOWER($1))
    ORDER BY t.is_featured DESC, t.start_date ASC NULLS LAST, t.created_at DESC
    LIMIT $2
  `, [destinationFilter ? destination : null, limit]);

  return Promise.all(rows.map(async (trip) => ({
    href: `/trips/${await ensureTripSlug(trip)}`,
    label: `${trip.title} — ${trip.destination}`,
  })));
}

export async function getPublicTripsForGuide(destinations: string[], limit = 6): Promise<TripSummary[]> {
  const patterns = destinations.map((destination) => `%${destination.toLowerCase()}%`);
  const rows = await query<TripSummary>(`
    SELECT t.id, t.slug, t.title, t.description, t.destination, t.duration_days,
      t.duration_nights, t.image_url, t.images, t.is_featured, t.tags,
      t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price,
      t.gotogether_price, t.start_date, t.registration_closed,
      u.id AS organizer_id, u.full_name AS organizer_name,
      u.role AS organizer_role, u.avatar_url AS organizer_avatar,
      u.organizer_slug
    FROM trips t
    JOIN users u ON u.id = t.organizer_id
    WHERE t.status = 'live' AND t.trip_type = 'premium'
      AND t.deleted_at IS NULL AND u.deleted_at IS NULL
      AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
      AND (COALESCE(array_length($1::text[], 1), 0) = 0 OR LOWER(t.destination) LIKE ANY($1::text[]))
    ORDER BY t.is_featured DESC, t.start_date ASC NULLS LAST, t.created_at DESC
    LIMIT $2
  `, [patterns, limit]);

  return Promise.all(rows.map(async (trip) => ({
    ...trip,
    slug: await ensureTripSlug(trip),
    organizer_slug: await ensureOrganizerSlug({
      id: trip.organizer_id || "",
      full_name: trip.organizer_name,
      organizer_slug: trip.organizer_slug,
    }),
  })));
}
