import { query } from "@/lib/db";
import { ensureTripSlug } from "@/lib/slugs";

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
