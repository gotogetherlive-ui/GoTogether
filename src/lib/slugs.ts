import { queryOne, run } from "@/lib/db";
import { slugify } from "@/lib/seo";

export function buildTripSlug(title: string, destination?: string | null): string {
  const base = slugify([destination, title].filter(Boolean).join(" "));
  return base || "trip";
}

export async function uniqueTripSlug(title: string, destination: string | null | undefined, tripId?: string): Promise<string> {
  const base = buildTripSlug(title, destination);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM public.trips WHERE slug = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1`,
      [candidate, tripId || null],
    );
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function ensureTripSlug(input: { id: string; title: string; destination?: string | null; slug?: string | null }): Promise<string> {
  if (input.slug) return input.slug;

  const slug = await uniqueTripSlug(input.title, input.destination, input.id);
  await run(`UPDATE public.trips SET slug = $1 WHERE id = $2 AND slug IS NULL`, [slug, input.id]);
  return slug;
}

export async function changeTripSlug(input: { tripId: string; currentSlug?: string | null; title: string; destination?: string | null }): Promise<string> {
  const nextSlug = await uniqueTripSlug(input.title, input.destination, input.tripId);
  if (input.currentSlug && input.currentSlug !== nextSlug) {
    await run(
      `INSERT INTO public.trip_slug_history (trip_id, old_slug)
       VALUES ($1, $2)
       ON CONFLICT (old_slug) DO NOTHING`,
      [input.tripId, input.currentSlug],
    );
  }
  await run(`UPDATE public.trips SET slug = $1 WHERE id = $2`, [nextSlug, input.tripId]);
  return nextSlug;
}

