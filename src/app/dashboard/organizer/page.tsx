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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 animate-pulse" />
            <Loader2 className="w-8 h-8 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-500 font-medium">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-8 pb-20 px-4">
      {/* Back Link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Profile
      </Link>

      {/* Hero Header with Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Organizer Dashboard</h1>
              <p className="text-white/70 mt-0.5">Manage your buddy trips and incoming requests</p>
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
              <div key={stat.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-white/70" />
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-2xl font-extrabold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trip List */}
      {trips.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="text-center py-16 px-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No trips yet</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create your first buddy trip plan and start connecting with like-minded travelers.</p>
            <button
              onClick={() => router.push('/buddy')}
              className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all"
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
              <div key={trip.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* Trip Header */}
                <div
                  className="px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status Accent */}
                    <div className={`w-1.5 h-16 rounded-full shrink-0 hidden md:block ${trip.status === 'live' ? 'bg-gradient-to-b from-emerald-400 to-emerald-500' :
                        trip.status === 'pending' ? 'bg-gradient-to-b from-amber-400 to-amber-500' :
                          'bg-gradient-to-b from-rose-400 to-rose-500'
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
                          <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-slate-50/80 to-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all gap-4">
                            <div className="flex items-center gap-4">
                              {/* Avatar */}
                              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-md shadow-orange-500/20">
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
