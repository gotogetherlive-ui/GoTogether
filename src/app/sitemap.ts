import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { categories, cityPages, destinations, guidePages, trustPages } from "@/lib/seo-content";
import { ensureTripSlug } from "@/lib/slugs";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

function entry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly"): SitemapEntry {
  return {
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: SitemapEntry[] = [
    entry("/", 1, "daily"),
    entry("/trips", 0.95, "daily"),
    entry("/destinations", 0.9),
    entry("/organizers", 0.8),
    entry("/guides", 0.75),
    ...categories.map((category) => entry(`/${category.slug}`, 0.85)),
    ...cityPages.map((page) => entry(`/${page.slug}`, 0.82)),
    ...destinations.map((destination) => entry(`/destinations/${destination.slug}`, 0.86)),
    ...guidePages.map((guide) => entry(`/guides/${guide.slug}`, 0.7, "monthly")),
    ...trustPages.map((page) => entry(page.path, 0.65, "monthly")),
  ];

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
        lastModified: trip.updated_at || trip.created_at || undefined,
        changeFrequency: "weekly" as const,
        priority: 0.78,
        images: trip.image_url ? [trip.image_url] : undefined,
      };
    }));

    return [
      ...staticEntries,
      ...tripEntries,
      ...(await Promise.all(organizers.map(async (organizer) => {
        const organizerSlug = await ensureOrganizerSlug(organizer);
        return {
          url: absoluteUrl(`/organizers/${organizerSlug}`),
          lastModified: organizer.updated_at || organizer.created_at || undefined,
          changeFrequency: "weekly" as const,
          priority: 0.72,
        };
      }))),
    ];
  } catch (error) {
    console.error("Failed to load dynamic sitemap entries", error);
    return staticEntries;
  }
}

