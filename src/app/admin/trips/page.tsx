"use client";

import { Check, X, Pin, Trash2, Loader2, ChevronDown, RefreshCw, Clock, DollarSign, ArrowRight, Sparkles, Image, Info, Users, Phone, User, Calendar, FileText, Download, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface BookingData {
  id: string;
  male_count: number;
  female_count: number;
  child_count: number;
  names: string;
  phone_number: string;
  alternate_phone_number: string | null;
  trip_date: string;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  user_phone: string | null;
  user_age: number | null;
  user_gender: string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  amount?: number | null;
  refund_status?: string | null;
  refund_amount?: number | null;
}

interface TripData {
  id: string;
  title: string;
  status: string;
  is_featured: number;
  destination: string;
  description: string;
  duration_days: number;
  duration_nights: number;
  pickup_point: string | null;
  drop_point: string | null;
  b2b_price: string | null;
  b2c_price: string | null;
  gotogether_price: string | null;
  image_url: string | null;
  brochure_url: string | null;
  created_at: string;
  organizer_name: string;
  organizer_role: string;
  organizer_email: string;
  booking_count: number;
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "live" | "rejected">("all");
  const [tripBookings, setTripBookings] = useState<Record<string, BookingData[]>>({});
  const [bookingsLoading, setBookingsLoading] = useState<string | null>(null);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trips");
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch {
      setError("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);


  const uniqueBookings = (items: BookingData[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const fetchBookings = async (tripId: string) => {
    setBookingsLoading(tripId);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setTripBookings(prev => ({ ...prev, [tripId]: uniqueBookings(data.bookings || []) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(null);
    }
  };

  const handleExpand = (tripId: string) => {
    if (expandedId === tripId) {
      setExpandedId(null);
    } else {
      setExpandedId(tripId);
      if (!tripBookings[tripId]) {
        fetchBookings(tripId);
      }
    }
  };

  const parseNames = (namesStr: string): string[] => {
    try { return JSON.parse(namesStr); } catch { return []; }
  };

  const handleStatus = async (id: string, status: string) => {
    let gotogether_price = "";
    if (status === 'live') {
      const price = prompt("Enter the GoTogether Price for this trip (e.g. ₹70,000):");
      if (price === null) return; // cancelled
      gotogether_price = price.trim();
    }

    try {
      await fetch(`/api/admin/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status, gotogether_price }),
      });
      fetchTrips();
    } catch {
      alert("Failed to update trip status");
    }
  };

  const handleFeature = async (id: string, current: number) => {
    try {
      await fetch(`/api/admin/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature", is_featured: current ? 0 : 1 }),
      });
      fetchTrips();
    } catch {
      alert("Failed to update featured status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip? This will also remove all related bookings, messages, and participants.")) return;
    try {
      await fetch(`/api/admin/trips/${id}`, { method: "DELETE" });
      fetchTrips();
    } catch {
      alert("Failed to delete trip");
    }
  };

  const handleRetryRefund = async (bookingId: string, tripId: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/retry-refund`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Refund retry initiated successfully.");
        fetchBookings(tripId);
      } else {
        alert(data.error || "Failed to retry refund.");
      }
    } catch (err) {
      console.error(err);
      alert("Error retrying refund.");
    }
  };

  const filteredTrips = trips.filter(t =>
    statusFilter === "all" ? true : t.status === statusFilter
  );

  const pendingCount = trips.filter(t => t.status === "pending").length;
  const liveCount = trips.filter(t => t.status === "live").length;

  if (loading && trips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading trips…</p>
        </div>
      </div>
    );
  }

  if (error && trips.length === 0) {
    return <div className="text-rose-500 font-medium">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trip Moderation</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage premium business trips</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} pending
            </span>
          )}
          <button
            onClick={fetchTrips}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-5">
        {(["all", "pending", "live", "rejected"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              statusFilter === filter
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {filter === "all"
              ? `All (${trips.length})`
              : filter === "pending"
              ? `🔸 Pending (${pendingCount})`
              : filter === "live"
              ? `✅ Live (${liveCount})`
              : `❌ Rejected (${trips.filter(t => t.status === "rejected").length})`}
          </button>
        ))}
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No trips found</p>
          <p className="text-sm text-slate-400 mt-1">
            {statusFilter !== "all" ? `No ${statusFilter} trips.` : "No premium trips to moderate."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip, idx) => (
            <div
              key={trip.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                expandedId === trip.id ? "shadow-lg border-slate-200" : "border-slate-100 hover:shadow-md hover:border-slate-200"
              } ${trip.status === "pending" ? "ring-1 ring-amber-100" : ""}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Main Row */}
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors duration-200"
                onClick={() => handleExpand(trip.id)}
              >
                {/* Expand Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  expandedId === trip.id ? "bg-orange-100 text-orange-500 rotate-180" : "bg-slate-100 text-slate-400"
                }`}>
                  <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                </div>

                {/* Trip Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {trip.is_featured ? (
                      <Pin className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
                    ) : null}
                    <h3 className="font-semibold text-slate-900 truncate">{trip.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{trip.organizer_name}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      trip.organizer_role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      trip.organizer_role === 'business' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {trip.organizer_role}
                    </span>
                  </div>
                  {/* Booking Count Badge */}
                  {trip.booking_count > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                      <Users className="w-3.5 h-3.5" /> {trip.booking_count}
                    </span>
                  )}
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  trip.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                  trip.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                  trip.status === 'cancelling' || trip.status === 'refunds_processing' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                  trip.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {trip.status}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {trip.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatus(trip.id, 'live')}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatus(trip.id, 'rejected')}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleFeature(trip.id, trip.is_featured)}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                      trip.is_featured ? 'text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                    title="Toggle Pin to Top"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:scale-110"
                    title="Delete Trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Details */}
              <div className={`overflow-hidden transition-all duration-400 ${
                expandedId === trip.id ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
                    {/* Trip Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                          <Info className="w-3 h-3 text-white" />
                        </div>
                        Trip Details
                      </h4>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Destination</span>
                          <span className="text-sm font-bold text-slate-900">{trip.destination || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Duration</span>
                          <span className="text-sm font-bold text-slate-900">{trip.duration_days}D / {trip.duration_nights || 0}N</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Created</span>
                          <span className="text-xs text-slate-600">{new Date(trip.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                        Route
                      </h4>
                      <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl p-4 border border-blue-100/50 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Pickup</span>
                          <span className="text-sm font-bold text-slate-900 text-right max-w-[60%] truncate">{trip.pickup_point || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-indigo-300" />
                          <ArrowRight className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 h-px bg-gradient-to-r from-indigo-300 to-blue-300" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Drop</span>
                          <span className="text-sm font-bold text-slate-900 text-right max-w-[60%] truncate">{trip.drop_point || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <DollarSign className="w-3 h-3 text-white" />
                        </div>
                        Pricing
                      </h4>
                      <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl p-4 border border-emerald-100/50 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">B2B</span>
                          <span className="text-sm font-bold text-blue-600">{trip.b2b_price || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">B2C</span>
                          <span className="text-sm font-bold text-purple-600">{trip.b2c_price || "—"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">GoTogether</span>
                          <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{trip.gotogether_price || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {trip.description && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                          <Clock className="w-3 h-3 text-white" />
                        </div>
                        Description
                      </h4>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed">
                        {trip.description}
                      </p>
                    </div>
                  )}

                  {/* Trip Image */}
                  {trip.image_url && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                          <Image className="w-3 h-3 text-white" />
                        </div>
                        Image
                      </h4>
                      <img
                        src={trip.image_url}
                        alt={trip.title}
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-100"
                      />
                    </div>
                  )}

                  {/* Brochure */}
                  {trip.brochure_url && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                          <FileText className="w-3 h-3 text-white" />
                        </div>
                        Brochure
                      </h4>
                      <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-xl p-4 border border-amber-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Trip Brochure</p>
                            <p className="text-xs text-slate-500">{trip.brochure_url.startsWith('data:application/pdf') ? 'PDF Document' : 'Image File'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const dataUrl = trip.brochure_url!;
                            const byteString = atob(dataUrl.split(',')[1]);
                            const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                            const blob = new Blob([ab], { type: mimeType });
                            const url = URL.createObjectURL(blob);
                            const ext = mimeType === 'application/pdf' ? '.pdf' : '.jpg';
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `brochure-${trip.title.replace(/\s+/g, '-').toLowerCase()}${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          View / Download
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interested People */}
                  <div className="mt-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      Interested People ({trip.booking_count})
                    </h4>
                    {bookingsLoading === trip.id ? (
                      <div className="flex items-center justify-center py-6 bg-slate-50 rounded-xl">
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                      </div>
                    ) : !tripBookings[trip.id] || tripBookings[trip.id].length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                        <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No bookings yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {tripBookings[trip.id].map((b) => {
                          const names = parseNames(b.names);
                          const totalPeople = b.male_count + b.female_count + b.child_count;
                          return (
                            <div key={b.id} className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-100/50 p-4 hover:shadow-md transition-shadow">
                              {/* User Header */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                                  {b.user_avatar ? (
                                    <img src={b.user_avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    b.user_name?.charAt(0)?.toUpperCase() || "U"
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900">{b.user_name}</p>
                                  <p className="text-xs text-slate-500">{b.user_email}</p>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-rose-100 text-rose-700'
                                }`}>
                                  {b.status}
                                </span>
                              </div>

                              {/* User Personal Details */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                {b.user_phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {b.user_phone}
                                  </div>
                                )}
                                {b.user_age && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <User className="w-3 h-3 text-slate-400" />
                                    Age: {b.user_age}
                                  </div>
                                )}
                                {b.user_gender && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {b.user_gender}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {b.phone_number}
                                </div>
                              </div>

                              {/* Passenger Details */}
                              <div className="bg-white/80 rounded-lg p-3 border border-violet-100/50">
                                <div className="flex items-center gap-3 text-xs mb-2">
                                  <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md font-bold">
                                    {totalPeople} people
                                  </span>
                                  {b.male_count > 0 && <span className="text-slate-500">Male: {b.male_count}</span>}
                                  {b.female_count > 0 && <span className="text-slate-500">Female: {b.female_count}</span>}
                                  {b.child_count > 0 && <span className="text-slate-500">Children: {b.child_count}</span>}
                                </div>
                                {names.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {names.map((name, i) => (
                                      <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Payment & Refund Details */}
                              {b.booking_status && (
                                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Booking Status:</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                        b.booking_status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                        b.booking_status === 'trip_cancelled' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>{b.booking_status?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Payment Status:</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                        b.payment_status === 'refunded' ? 'bg-emerald-100 text-emerald-700' :
                                        b.payment_status === 'refund_failed' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                                        b.payment_status === 'refund_pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>{b.payment_status?.replace('_', ' ')}</span>
                                    </div>
                                    {b.refund_amount && (
                                      <div className="text-[10px] text-slate-500">
                                        Refunded Amount: <strong className="text-slate-800">₹{(Number(b.refund_amount) / 100).toLocaleString('en-IN')}</strong>
                                      </div>
                                    )}
                                  </div>

                                  {b.payment_status === 'refund_failed' && (
                                    <button
                                      onClick={() => handleRetryRefund(b.id, trip.id)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-md shadow-rose-600/10 flex items-center gap-1.5 transition-all animate-bounce"
                                    >
                                      <AlertCircle className="w-3.5 h-3.5" /> Retry Refund
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center gap-4 mt-2.5 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Travel: {new Date(b.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Booked: {new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

