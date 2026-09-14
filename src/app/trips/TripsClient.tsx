"use client";

import { useState } from "react";
import Link from "next/link";
import TripCard, { type TripSummary } from "@/components/TripCard";
import MobileCardStack from "@/components/MobileCardStack";
import { ArrowRight, Compass, Search } from "lucide-react";

type TripsClientProps = {
  initialTrips: TripSummary[];
  initialSearchQuery: string;
  initialDate: string;
  initialDuration: string;
  initialMinBudget?: string;
  initialMaxBudget?: string;
  emptyStateTitle: string;
  emptyStateMessage: string;
  dataUnavailable: boolean;
};

export default function TripsClient({ initialTrips, initialSearchQuery, initialDate, initialDuration, initialMinBudget = "", initialMaxBudget = "", emptyStateTitle, emptyStateMessage, dataUnavailable }: TripsClientProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filterDate, setFilterDate] = useState(initialDate);
  const [filterDuration, setFilterDuration] = useState(initialDuration);

  const [minBudget, setMinBudget] = useState(initialMinBudget);
  const [maxBudget, setMaxBudget] = useState(initialMaxBudget);

  const hasFilters = Boolean(initialSearchQuery || initialDate || initialDuration || initialMinBudget || initialMaxBudget);

  return (
    <>
      <form action="/trips" method="get" className="mb-8 grid items-end gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="min-w-0 text-xs font-semibold text-slate-700">Where would you like to go?
          <div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="q" aria-label="Search trips" type="search" placeholder="Destination, trip, or pickup city" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="premium-input-icon" /></div>
        </label>
        <label className="text-xs font-semibold text-slate-700">Departure date<input name="date" aria-label="Filter trips by date" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="premium-input mt-2" /></label>
        <label className="text-xs font-semibold text-slate-700">Trip length<select name="duration" aria-label="Filter trips by duration" value={filterDuration} onChange={e => setFilterDuration(e.target.value)} className="premium-select mt-2 w-full"><option value="">Any duration</option><option value="1-3">1–3 days</option><option value="4-7">4–7 days</option><option value="8+">8+ days</option></select></label>
        <label className="text-xs font-semibold text-slate-700">Minimum budget (INR)<input name="minBudget" aria-label="Minimum budget in rupees" type="number" inputMode="decimal" min="0" max={maxBudget || "1000000000"} step="0.01" placeholder="No minimum" value={minBudget} onChange={e => setMinBudget(e.target.value)} className="premium-input mt-2" /></label>
        <label className="text-xs font-semibold text-slate-700">Maximum budget (INR)<input name="maxBudget" aria-label="Maximum budget in rupees" type="number" inputMode="decimal" min={minBudget || "0"} max="1000000000" step="0.01" placeholder="No maximum" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} className="premium-input mt-2" /></label>
        <button type="submit" className="gt-button min-h-11">Search trips <ArrowRight className="h-4 w-4" /></button>
      </form>

      {hasFilters && <p className="mb-6 text-sm text-slate-600">Showing filtered departures. <Link href="/trips" className="ml-2 underline underline-offset-4">Clear all filters</Link></p>}
      {dataUnavailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-16 text-center shadow-sm">
          <Compass className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-900">Trips are taking a short break</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-600">We could not load our adventures right now. Please try again shortly.</p>
        </div>
      ) : initialTrips.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
          <Compass className="mx-auto mb-5 h-9 w-9 text-orange-700" />
          <h2 className="font-serif text-3xl text-slate-900">{hasFilters ? "No trips match your search." : emptyStateTitle}</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-600">{hasFilters ? "Try another destination, date, trip length, or budget, or browse all available departures." : emptyStateMessage}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5"><Link href={hasFilters ? '/trips' : '/custom-trip'} className="gt-button">{hasFilters ? 'Browse all trips' : 'Plan a custom trip'} <ArrowRight className="h-4 w-4" /></Link><Link href="/buddy" className="gt-text-link">Find a travel buddy</Link></div>
        </div>
      ) : (
        <MobileCardStack label="Trip cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {initialTrips.map((trip) => {
            const isPast = trip.start_date ? new Date(trip.start_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            const isClosed = trip.registration_closed === 1;

            return (
              <div key={trip.id} className="relative h-full group/trip">
                <TripCard trip={trip} />

                {/* Overlay for past or closed trips */}
                {(isPast || isClosed) && (
                  <div className="pointer-events-none absolute left-4 top-4 z-20">
                    <span className="bg-slate-900 text-white font-medium px-3 py-1.5 rounded-md text-xs">
                      {isPast ? "Trip Completed" : "Registration Closed"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </MobileCardStack>
      )}
    </>
  );
}
