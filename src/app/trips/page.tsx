import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { MapPin } from "lucide-react";
import db from "@/lib/db";
import TripsClient from "./TripsClient";
import Page3DWrapper from "@/components/Page3DWrapper";
import FadeInScroll from "@/components/FadeInScroll";

export const dynamic = "force-dynamic";

export default function FindTripPage() {
  // Fetch live premium trips (super_admin or business) directly from the database
  const trips = db.prepare(`
    SELECT 
      t.id, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.images, t.status, t.is_featured, t.tags, t.brochure_url, t.pickup_point, t.drop_point, t.b2b_price, t.b2c_price, t.gotogether_price, t.start_date, t.registration_closed,
      u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    WHERE t.status = 'live' AND t.trip_type = 'premium'
    ORDER BY t.is_featured DESC, t.created_at DESC
  `).all() as any[];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar />
      
      <Page3DWrapper className="flex-1 flex flex-col">
        <main className="flex-1 pt-28 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <FadeInScroll delay={0}>
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                Curated Adventures
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Discover premium trips organized by verified businesses and admins. Guaranteed safety, quality, and unforgettable experiences.
              </p>
            </div>
          </FadeInScroll>

          <FadeInScroll delay={0.2}>
            <TripsClient initialTrips={trips} />
          </FadeInScroll>
        </main>
      </Page3DWrapper>

      <Footer />
    </div>
  );
}
