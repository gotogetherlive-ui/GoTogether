import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { absoluteUrl, isPrivatePath } from "@/lib/seo";
import { trustPages } from "@/lib/seo-content";
import { destinationGuides } from "@/lib/destination-guides";
import { heroImages } from "@/lib/hero-images";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

const INVENTORY_FALLBACK_LAST_MODIFIED = new Date("2026-07-09T00:00:00.000+05:30");
const FEATURE_PAGES_UPDATED_AT = new Date("2026-09-09T00:00:00+05:30");
const HOME_UPDATED_AT = new Date("2026-09-10T00:00:00+05:30");

function entry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly", lastModified?: SitemapEntry["lastModified"]): SitemapEntry {
  return {
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

function publicEntry(path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"] = "weekly", lastModified?: SitemapEntry["lastModified"]): SitemapEntry | null {
  return isPrivatePath(path) ? null : entry(path, priority, changeFrequency, lastModified);
}

function uniqueEntries(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function sitemapImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return absoluteUrl(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = [
    { ...entry("/", 1, "daily", HOME_UPDATED_AT), images: heroImages.map(image => absoluteUrl(image.src)) },
    publicEntry("/trips", 0.95, "daily"),
    publicEntry("/custom-trip", 0.95, "weekly", FEATURE_PAGES_UPDATED_AT),
    publicEntry("/buddy", 0.95, "daily", FEATURE_PAGES_UPDATED_AT),
    publicEntry("/destinations", 0.9),
    publicEntry("/organizers", 0.8),
    publicEntry("/guides", 0.75),
    ...trustPages.map((page) => publicEntry(page.path, 0.65, "monthly", page.path === "/about" ? HOME_UPDATED_AT : undefined)),
    ...destinationGuides.map((guide) => ({
      url: absoluteUrl(guide.path),
      changeFrequency: "weekly" as const,
      priority: 0.88,
      images: guide.gallery.map((image) => absoluteUrl(image.src)),
    })),
  ].filter((item): item is SitemapEntry => Boolean(item));

  try {
    const trips = await query<{ id: string; title: string; destination?: string | null; slug: string; updated_at?: string | null; created_at?: string | null; image_url?: string | null }>(
      `SELECT t.id, t.title, t.destination, t.slug, t.created_at,
              COALESCE((to_jsonb(t)->>'updated_at')::timestamptz, t.created_at) AS updated_at,
              t.image_url
       FROM trips t
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND t.slug IS NOT NULL
         AND EXISTS (SELECT 1 FROM users u WHERE u.id = t.organizer_id AND u.deleted_at IS NULL)
         AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
       ORDER BY t.created_at DESC
       LIMIT 5000`,
      [],
    );

    const organizers = await query<{ id: string; full_name: string; organizer_slug: string; created_at?: string | null; updated_at?: string | null }>(
      `SELECT u.id, u.full_name, u.organizer_slug, u.created_at,
              MAX(t.updated_at) AS updated_at
       FROM users u
       JOIN trips t ON t.organizer_id = u.id
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND (t.start_date IS NULL OR t.start_date::date + GREATEST(COALESCE(t.duration_days, 0), 0) >= CURRENT_DATE)
         AND u.deleted_at IS NULL
         AND u.organizer_slug IS NOT NULL
         AND u.role IN ('business', 'super_admin')
       GROUP BY u.id, u.full_name, u.organizer_slug, u.created_at
       LIMIT 1000`,
      [],
    );

    const tripEntries = trips.map((trip) => {
      const imageUrl = sitemapImageUrl(trip.image_url);
      return {
        url: absoluteUrl(`/trips/${trip.slug}`),
        lastModified: trip.updated_at || trip.created_at || INVENTORY_FALLBACK_LAST_MODIFIED,
        changeFrequency: "weekly" as const,
        priority: 0.78,
        images: imageUrl ? [imageUrl] : undefined,
      };
    });

    const organizerEntries = organizers.map((organizer) => ({
      url: absoluteUrl(`/organizers/${organizer.organizer_slug}`),
      lastModified: organizer.updated_at || organizer.created_at || INVENTORY_FALLBACK_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.72,
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
