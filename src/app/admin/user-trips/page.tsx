"use client";

import { Check, X, Pin, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface TripData {
  id: string;
  title: string;
  status: string;
  is_featured: number;
  organizer_name: string;
  organizer_role: string;
  organizer_email: string;
}

export default function AdminUserTripsPage() {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/user-trips");
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch {
      setError("Failed to load trips. Please retry.");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
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
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
      await fetch(`/api/admin/trips/${id}`, { method: "DELETE" });
      fetchTrips();
    } catch {
      alert("Failed to delete trip");
    }
  };

  if (loading && trips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error && trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3">
          <p className="text-rose-500 font-medium">{error}</p>
        </div>
        <button
          onClick={fetchTrips}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">User Trips</h1>
        <button
          onClick={fetchTrips}
          className={`flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all duration-300 hover:shadow-sm ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Error banner if trips exist but refresh failed */}
      {error && trips.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {error}
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 transition-colors font-bold text-lg leading-none">
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-sm font-semibold text-slate-600">
                <th className="p-4">Trip Title</th>
                <th className="p-4">Organizer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {trip.is_featured ? <Pin className="w-4 h-4 text-orange-500 fill-orange-500" /> : null}
                      {trip.title}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="font-semibold text-slate-900">{trip.organizer_name}</div>
                    <div className="text-slate-500 text-xs">{trip.organizer_email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${trip.organizer_role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        trip.organizer_role === 'business' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                      }`}>
                      {trip.organizer_role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${trip.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                        trip.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                      }`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {trip.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatus(trip.id, 'live')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatus(trip.id, 'rejected')} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reject">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleFeature(trip.id, trip.is_featured)} className={`p-2 rounded-lg transition-colors ${trip.is_featured ? 'text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:bg-slate-50'}`} title="Toggle Pin to Top">
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(trip.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Trip">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No trips found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
