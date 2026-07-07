"use client";

import { useState } from "react";
import TripCard, { type TripSummary } from "@/components/TripCard";
import { Search } from "lucide-react";

export default function TripsClient({ initialTrips }: { initialTrips: TripSummary[] }) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDuration, setFilterDuration] = useState("");

  const filteredTrips = initialTrips.filter((trip) => {
    const matchesSearch = trip.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trip.starting_location || trip.pickup_point || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.title?.toLowerCase().includes(searchQuery.toLowerCase());

    // For premium trips, we check start_date
    const matchesDate = filterDate ? trip.start_date === filterDate : true;

    let matchesDuration = true;
    if (filterDuration === "1-3") matchesDuration = trip.duration_days <= 3;
    if (filterDuration === "4-7") matchesDuration = trip.duration_days >= 4 && trip.duration_days <= 7;
    if (filterDuration === "8+") matchesDuration = trip.duration_days >= 8;

    return matchesSearch && matchesDate && matchesDuration;
  });

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, destination or starting location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition"
            suppressHydrationWarning
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 outline-none transition"
            title="Filter by starting date"
            suppressHydrationWarning
          />
          <select
            value={filterDuration}
            onChange={(e) => setFilterDuration(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 outline-none transition bg-white"
            suppressHydrationWarning
          >
            <option value="">Any Duration</option>
            <option value="1-3">1-3 Days</option>
            <option value="4-7">4-7 Days</option>
            <option value="8+">8+ Days</option>
          </select>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No trips available</h3>
          <p className="text-slate-500">Check back later for new curated adventures or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTrips.map((trip) => {
            const isPast = trip.start_date ? new Date(trip.start_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            const isClosed = trip.registration_closed === 1;

            return (
              <div key={trip.id} className="relative group/trip">
                <TripCard trip={trip} />

                {/* Overlay for past or closed trips */}
                {(isPast || isClosed) && (
                  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                    <span className="bg-slate-800 text-white font-bold px-6 py-3 rounded-full shadow-lg text-sm tracking-wide">
                      {isPast ? "Trip Completed" : "Registration Closed"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
