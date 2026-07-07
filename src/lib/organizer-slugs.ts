import { queryOne, run } from "@/lib/db";
import { slugify } from "@/lib/seo";

export function buildOrganizerSlug(displayName: string): string {
  return slugify(displayName) || "organizer";
}

export async function uniqueOrganizerSlug(displayName: string, organizerId?: string): Promise<string> {
  const base = buildOrganizerSlug(displayName);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM public.users WHERE organizer_slug = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1`,
      [candidate, organizerId || null],
    );
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function ensureOrganizerSlug(input: { id: string; full_name?: string | null; organizer_slug?: string | null }): Promise<string> {
  if (input.organizer_slug) return input.organizer_slug;

  const slug = await uniqueOrganizerSlug(input.full_name || "Organizer", input.id);
  await run(`UPDATE public.users SET organizer_slug = $1 WHERE id = $2 AND organizer_slug IS NULL`, [slug, input.id]);
  return slug;
}

export async function changeOrganizerSlug(input: { organizerId: string; currentSlug?: string | null; displayName: string }): Promise<string> {
  const nextSlug = await uniqueOrganizerSlug(input.displayName, input.organizerId);
  if (input.currentSlug && input.currentSlug !== nextSlug) {
    await run(
      `INSERT INTO public.organizer_slug_history (organizer_id, old_slug)
       VALUES ($1, $2)
       ON CONFLICT (old_slug) DO NOTHING`,
      [input.organizerId, input.currentSlug],
    );
  }
  await run(`UPDATE public.users SET organizer_slug = $1 WHERE id = $2`, [nextSlug, input.organizerId]);
  return nextSlug;
}
