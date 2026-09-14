"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, MapPin, Calendar, Heart, ArrowLeft, Users, Clock, MessageCircle, ToggleLeft, ToggleRight, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Request {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  profession: string | null;
  fooding_habit: string | null;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  status: string;
  trip_type: string;
  registration_closed: number;
  created_at: string;
  requests: Request[];
}

export default function OrganizerDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const router = useRouter();


  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/organizer/trips");
      const data = await res.json();
      if (data.trips) {
        setTrips(data.trips);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);
  const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/organizer/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchTrips();
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error performing action");
    }
  };

  const handleToggleRegistration = async (tripId: string) => {
    try {
      const res = await fetch(`/api/organizer/trips/${tripId}/close`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchTrips();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update registration status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating registration status');
    }
  };

  const formatTripDate = (value: string) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRequestDate = (value: string) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  // Stats
  const totalTrips = trips.length;
  const totalRequests = trips.reduce((sum, t) => sum + t.requests.length, 0);
  const pendingRequests = trips.reduce((sum, t) => sum + t.requests.filter(r => r.status === 'pending').length, 0);
  const acceptedRequests = trips.reduce((sum, t) => sum + t.requests.filter(r => r.status === 'accepted').length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 animate-pulse" />
            <Loader2 className="w-8 h-8 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-500 font-medium">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-20 pt-8 md:px-6">
      {/* Back Link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Profile
      </Link>

      {/* Hero Header with Stats */}
      <header className="gt-hero-panel relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        {/* Decorative elements */}
        <div className="hidden" />
        <div className="hidden" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Buddy trip operations</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Organizer dashboard</h1>
              <p className="mt-1 text-slate-600">Manage published plans and incoming traveler requests.</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Total Trips", value: totalTrips, icon: MapPin },
              { label: "Total Requests", value: totalRequests, icon: Users },
              { label: "Pending", value: pendingRequests, icon: Clock },
              { label: "Accepted", value: acceptedRequests, icon: CheckCircle },
            ].map((stat) => (
              <div key={stat.label} className="gt-panel rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Trip List */}
      {trips.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center py-16 px-8">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50">
              <MapPin className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No trips yet</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create your first buddy trip plan and start connecting with like-minded travelers.</p>
            <button
              onClick={() => router.push('/buddy')}
              className="gt-primary-action rounded-xl px-6 py-3 font-bold transition"
            >
              Create a Trip Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {trips.map(trip => {
            const pendingCount = trip.requests.filter(r => r.status === 'pending').length;
            const isExpanded = expandedTrip === trip.id;

            return (
              <div key={trip.id} className="gt-panel gt-card-lift overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Trip Header */}
                <div
                  className="flex cursor-pointer flex-col items-start justify-between gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status Accent */}
                    <div className={`hidden h-16 w-1 shrink-0 rounded-full md:block ${trip.status === 'live' ? 'bg-emerald-500' :
                        trip.status === 'pending' ? 'bg-amber-500' :
                          'bg-rose-500'
                      }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="text-xl font-bold text-slate-900 truncate">{trip.title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider ${trip.status === 'live' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' :
                            trip.status === 'pending' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' :
                              'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                          }`}>
                          {trip.status}
                        </span>
                        {trip.registration_closed === 1 && (
                          <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                            Closed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-400" /> {trip.destination}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-orange-400" /> {formatTripDate(trip.created_at)}
                        </span>
                        {pendingCount > 0 && (
                          <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                            <Inbox className="w-3.5 h-3.5" /> {pendingCount} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {trip.trip_type === 'buddy' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/chat/${trip.id}`); }}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200/50"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat
                      </button>
                    )}
                    {trip.status !== 'deleted' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleRegistration(trip.id); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ring-1 ${trip.registration_closed
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200/50"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100 ring-rose-200/50"
                          }`}
                      >
                        {trip.registration_closed ? (
                          <><ToggleLeft className="w-4 h-4" /> Open</>
                        ) : (
                          <><ToggleRight className="w-4 h-4" /> Close</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Requests Panel */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Incoming Requests ({trip.requests.length})
                    </h4>

                    {trip.requests.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No requests yet</p>
                        <p className="text-xs text-slate-400 mt-1">Share your trip to attract travel buddies!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {trip.requests.map(req => (
                          <div key={req.id} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white md:flex-row md:items-center">
                            <div className="flex items-center gap-4">
                              {/* Avatar */}
                              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-base font-bold text-white">
                                {req.avatar_url ? (
                                  <img src={req.avatar_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  req.full_name?.charAt(0)?.toUpperCase() || "U"
                                )}
                              </div>

                              <div>
                                <p className="font-bold text-slate-900 text-base">{req.full_name}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <span className="text-xs text-slate-500 font-medium">{req.age || '?'} yrs</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span className="text-xs text-slate-500 font-medium">{req.gender || '?'}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span className="text-xs text-slate-500 font-medium capitalize">{req.profession || 'Not specified'}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span className="text-xs text-slate-500 font-medium">{req.fooding_habit || 'Any diet'}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">{formatRequestDate(req.created_at)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                              {req.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleAction(req.id, 'accept')}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white text-rose-600 hover:bg-rose-500 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all ring-1 ring-rose-200 hover:ring-rose-500"
                                  >
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                </>
                              ) : (
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${req.status === 'accepted'
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                  }`}>
                                  {req.status === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
