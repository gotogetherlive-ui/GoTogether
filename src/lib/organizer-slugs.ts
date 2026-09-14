import { queryOne, run } from "@/lib/db";
import { slugify } from "@/lib/seo";

function buildOrganizerSlug(displayName: string): string {
  return slugify(displayName) || "organizer";
}

async function uniqueOrganizerSlug(displayName: string, organizerId?: string): Promise<string> {
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
