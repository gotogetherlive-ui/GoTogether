import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoriesClient from "./StoriesClient";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { redirect } from "next/navigation";
import Page3DWrapper from "@/components/Page3DWrapper";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { query } from '@/lib/db';

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = await isAdminUser(user);

  // Fetch the logged-in user's trips (organized or joined) so they can link them to posts
  const userTrips = await query(`
    SELECT t.id, t.title, t.destination, t.start_date
    FROM trips t
    LEFT JOIN trip_participants tp ON t.id = tp.trip_id
    WHERE t.status = 'live' AND (t.organizer_id = $1 OR tp.user_id = $2)
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [user.id, user.id]) as { id: string; title: string; destination: string; start_date: string | null }[];

  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <Navbar />
        <Page3DWrapper className="flex-1 flex flex-col pt-24">
          <StoriesClient currentUser={user} isAdmin={isAdmin} userTrips={userTrips} />
        </Page3DWrapper>
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}

