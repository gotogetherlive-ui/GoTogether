"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TripCard, { type TripSummary } from "@/components/TripCard";
import { ArrowRight, Compass, MapPin, Plane, Search, Users } from "lucide-react";

type TripsClientProps = {
  initialTrips: TripSummary[];
  emptyStateTitle: string;
  emptyStateMessage: string;
  dataUnavailable: boolean;
};

export default function TripsClient({ initialTrips, emptyStateTitle, emptyStateMessage, dataUnavailable }: TripsClientProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") || "");
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

      {dataUnavailable ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-16 text-center shadow-sm">
          <Compass className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-900">Trips are taking a short break</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">We could not load our adventures right now. Please try again shortly.</p>
        </div>
      ) : initialTrips.length === 0 ? (
        <div className="trip-empty-card relative overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-orange-500 bg-slate-900 px-4 py-9 text-center shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] sm:px-8 sm:py-12">
          <Image
            src="/trips-group-collage.webp"
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1216px"
            className="trip-empty-collage object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-slate-950/35" />
          <div aria-hidden="true" className="trip-empty-shimmer absolute inset-x-0 top-0 h-px" />
          <div className="relative mx-auto max-w-3xl rounded-2xl border border-white/80 bg-white/94 px-5 py-8 shadow-2xl shadow-slate-950/25 backdrop-blur-md sm:px-10 sm:py-10">
            <div aria-hidden="true" className="trip-empty-route relative mx-auto mb-6 h-24 w-full max-w-sm">
              <svg viewBox="0 0 360 96" className="absolute inset-0 h-full w-full" fill="none">
                <path className="trip-empty-route-line" d="M34 72 C104 12 250 12 326 72" />
              </svg>
              <span className="trip-empty-pin absolute bottom-1 left-3 flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-600 shadow-sm">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="trip-empty-pin trip-empty-pin-delayed absolute bottom-1 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-600 shadow-sm">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="trip-empty-plane absolute left-1/2 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-200">
                <Plane className="h-5 w-5 rotate-45" fill="currentColor" />
              </span>
            </div>
            <h2 className="trip-empty-copy text-2xl font-bold text-slate-900 sm:text-3xl">
              {emptyStateTitle}
            </h2>
            <p className="trip-empty-copy trip-empty-copy-delayed mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
              {emptyStateMessage}
            </p>
            <div className="mx-auto my-8 h-px max-w-lg bg-slate-200" />
            <p className="text-sm font-semibold text-slate-800">Continue planning your journey</p>
            <div className="trip-empty-actions mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/custom-trip"
                className="trip-empty-primary group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition duration-300 hover:-translate-y-1 hover:bg-orange-600 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <Compass className="h-5 w-5" />
                Plan a Custom Trip
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/buddy"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:text-orange-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <Users className="h-5 w-5" />
                Find a Travel Buddy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No trips match those filters</h3>
          <p className="text-slate-500">Try a different destination, date, or duration.</p>
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
