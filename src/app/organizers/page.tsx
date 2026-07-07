import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { query } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { ensureOrganizerSlug } from "@/lib/organizer-slugs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Verified Travel Organizers in India | GoTogether",
  description: "Explore public GoTogether organizer profiles with verified trip inventory, destinations served, organizer context, and upcoming public trips.",
  path: "/organizers",
});

type OrganizerSummary = {
  id: string;
  organizer_slug?: string | null;
  full_name: string;
  role: string;
  trip_count: string | number;
  destinations: string | null;
};

export default async function OrganizersPage() {
  let organizers: OrganizerSummary[] = [];

  try {
    const rows = await query<OrganizerSummary>(
      `SELECT u.id, u.organizer_slug, u.full_name, u.role, COUNT(t.id) as trip_count, STRING_AGG(DISTINCT t.destination, ', ') as destinations
       FROM users u
       JOIN trips t ON t.organizer_id = u.id
       WHERE t.status = 'live' AND t.trip_type = 'premium' AND t.deleted_at IS NULL
         AND u.deleted_at IS NULL AND u.role IN ('business', 'super_admin')
       GROUP BY u.id, u.organizer_slug, u.full_name, u.role
       ORDER BY COUNT(t.id) DESC, u.full_name ASC
       LIMIT 100`,
      [],
    );
    organizers = await Promise.all(rows.map(async (organizer) => ({ ...organizer, organizer_slug: await ensureOrganizerSlug(organizer) })));
  } catch (error) {
    console.error("Failed to load organizers", error);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-5">Verified Travel Organizers</h1>
        <p className="text-lg text-slate-600 max-w-4xl mb-10">
          Public organizer profiles help travelers compare who owns a trip, which destinations they serve, and what upcoming public trips they operate. Organizer pages never expose payment accounts, dashboard data, internal notes, or private booking data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {organizers.map((organizer) => (
            <Link key={organizer.id} href={`/organizers/${organizer.organizer_slug}`} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-200 transition-colors">
              <h2 className="text-xl font-bold">{organizer.full_name || "Verified Organizer"}</h2>
              <p className="text-sm text-slate-500 mt-2">{Number(organizer.trip_count)} public trip{Number(organizer.trip_count) === 1 ? "" : "s"}</p>
              <p className="text-sm text-slate-600 mt-2">{organizer.destinations || "Destinations vary by departure"}</p>
            </Link>
          ))}
          {!organizers.length && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-600">
              Public organizer profiles will appear when verified organizers have live public trips.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
