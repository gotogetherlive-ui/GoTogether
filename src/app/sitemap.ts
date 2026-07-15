import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { absoluteUrl, isPrivatePath } from "@/lib/seo";
import { trustPages } from "@/lib/seo-content";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

const INVENTORY_FALLBACK_LAST_MODIFIED = new Date("2026-07-09T00:00:00.000+05:30");

function entry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly", lastModified?: SitemapEntry["lastModified"]): SitemapEntry {
  return {
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

function publicEntry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly"): SitemapEntry | null {
  return isPrivatePath(path) ? null : entry(path, priority, changeFrequency);
}

function uniqueEntries(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = [
    publicEntry("/", 1, "daily"),
    publicEntry("/trips", 0.95, "daily"),
    publicEntry("/destinations", 0.9),
    publicEntry("/organizers", 0.8),
    publicEntry("/guides", 0.75),
    ...trustPages.map((page) => publicEntry(page.path, 0.65, "monthly")),
  ].filter((item): item is SitemapEntry => Boolean(item));

  try {
    const trips = await query<{ id: string; title: string; destination?: string | null; slug?: string | null; updated_at?: string | null; created_at?: string | null; image_url?: string | null }>(
      `SELECT t.id, t.title, t.destination, t.slug, t.created_at,
              COALESCE((to_jsonb(t)->>'updated_at')::timestamptz, t.created_at) AS updated_at,
              t.image_url
       FROM trips t
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
       ORDER BY t.created_at DESC
       LIMIT 5000`,
      [],
    );

    const organizers = await query<{ id: string; full_name: string; organizer_slug?: string | null; created_at?: string | null; updated_at?: string | null }>(
      `SELECT DISTINCT u.id, u.full_name, u.organizer_slug, u.created_at, u.updated_at
       FROM users u
       JOIN trips t ON t.organizer_id = u.id
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
         AND u.deleted_at IS NULL
         AND u.role IN ('business', 'super_admin')
       LIMIT 1000`,
      [],
    );

    const tripEntries = await Promise.all(trips.map(async (trip) => {
      const tripSlug = await ensureTripSlug(trip);
      return {
        url: absoluteUrl(`/trips/${tripSlug}`),
        lastModified: trip.updated_at || trip.created_at || INVENTORY_FALLBACK_LAST_MODIFIED,
        changeFrequency: "weekly" as const,
        priority: 0.78,
        images: trip.image_url ? [trip.image_url] : undefined,
      };
    }));

    const organizerEntries = await Promise.all(organizers.map(async (organizer) => {
      const organizerSlug = await ensureOrganizerSlug(organizer);
      return {
        url: absoluteUrl(`/organizers/${organizerSlug}`),
        lastModified: organizer.updated_at || organizer.created_at || INVENTORY_FALLBACK_LAST_MODIFIED,
        changeFrequency: "weekly" as const,
        priority: 0.72,
      };
    }));

    return uniqueEntries([
      ...staticEntries,
      ...tripEntries,
      ...organizerEntries,
    ]);
  } catch (error) {
    console.error("Failed to load dynamic sitemap entries", error);
    return uniqueEntries(staticEntries);
  }
}
