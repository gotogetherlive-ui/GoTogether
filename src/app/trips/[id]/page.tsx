import { notFound } from "next/navigation";
import db from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripDetailsClient from "./TripDetailsClient";

export const dynamic = "force-dynamic";

export default async function TripDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const trip = db.prepare(`
    SELECT 
      t.*,
      u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.id = ?
  `).get(id) as any;

  if (!trip) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full">
        <TripDetailsClient trip={trip} />
      </main>
      <Footer />
    </div>
  );
}
