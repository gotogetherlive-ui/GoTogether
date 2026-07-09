import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { absoluteUrl, isPrivatePath } from "@/lib/seo";
import { categories, cityPages, destinations, guidePages, trustPages } from "@/lib/seo-content";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

const STATIC_LAST_MODIFIED = new Date("2026-07-09T00:00:00.000+05:30");

function entry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly", lastModified: SitemapEntry["lastModified"] = STATIC_LAST_MODIFIED): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified,
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
    ...categories.map((category) => publicEntry(`/${category.slug}`, 0.85)),
    ...cityPages.map((page) => publicEntry(`/${page.slug}`, 0.82)),
    ...destinations.map((destination) => publicEntry(`/destinations/${destination.slug}`, 0.86)),
    ...guidePages.map((guide) => publicEntry(`/guides/${guide.slug}`, 0.7, "monthly")),
    ...trustPages.map((page) => publicEntry(page.path, 0.65, "monthly")),
  ].filter((item): item is SitemapEntry => Boolean(item));

  try {
    const trips = await query<{ id: string; title: string; destination?: string | null; slug?: string | null; updated_at?: string | null; created_at?: string | null; image_url?: string | null }>(
      `SELECT id, title, destination, slug, created_at, updated_at, image_url
       FROM trips
       WHERE status = 'live' AND trip_type = 'premium' AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 5000`,
      [],
    );

    const organizers = await query<{ id: string; full_name: string; organizer_slug?: string | null; created_at?: string | null; updated_at?: string | null }>(
      `SELECT DISTINCT u.id, u.full_name, u.organizer_slug, u.created_at, u.updated_at
       FROM users u
       JOIN trips t ON t.organizer_id = u.id
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND u.deleted_at IS NULL
         AND u.role IN ('business', 'super_admin')
       LIMIT 1000`,
      [],
    );

    const tripEntries = await Promise.all(trips.map(async (trip) => {
      const tripSlug = await ensureTripSlug(trip);
      return {
        url: absoluteUrl(`/trips/${tripSlug}`),
        lastModified: trip.updated_at || trip.created_at || STATIC_LAST_MODIFIED,
        changeFrequency: "weekly" as const,
        priority: 0.78,
        images: trip.image_url ? [trip.image_url] : undefined,
      };
    }));

    const organizerEntries = await Promise.all(organizers.map(async (organizer) => {
      const organizerSlug = await ensureOrganizerSlug(organizer);
      return {
        url: absoluteUrl(`/organizers/${organizerSlug}`),
        lastModified: organizer.updated_at || organizer.created_at || STATIC_LAST_MODIFIED,
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
