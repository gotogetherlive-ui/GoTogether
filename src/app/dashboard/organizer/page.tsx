"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, MapPin, Calendar, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    fetchTrips();
  }, []);

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

  const handleAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/organizer/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchTrips(); // Refresh to get updated status
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pt-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Organizer Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your created trips and incoming requests</p>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center">
          <p className="text-slate-500 mb-4">You haven't organized any trips yet.</p>
          <button 
            onClick={() => router.push('/buddy')}
            className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-orange-600 transition"
          >
            Create a Trip Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map(trip => (
            <div key={trip.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{trip.title}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-orange-400" /> {trip.destination}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-400" /> {new Date(trip.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {trip.trip_type === 'buddy' && (
                  <button
                     onClick={() => router.push(`/chat/${trip.id}`)}
                     className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-200 transition"
                  >
                    Trip Chat
                  </button>
                )}
                <button
                  onClick={() => handleToggleRegistration(trip.id)}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    trip.registration_closed 
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                      : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                  }`}
                >
                  {trip.registration_closed ? "Open Registration" : "Close Registration"}
                </button>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Incoming Requests</h4>
                {trip.requests.length === 0 ? (
                  <p className="text-slate-400 italic text-sm">No requests yet.</p>
                ) : (
                  <div className="space-y-4">
                    {trip.requests.map(req => (
                      <div key={req.id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 overflow-hidden shrink-0">
                            {req.avatar_url ? <img src={req.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : req.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{req.full_name}</p>
                            <p className="text-xs text-slate-500 font-medium">{req.age || '?'} yrs • {req.gender || '?'} • {req.profession || 'Profession unknown'} • {req.fooding_habit || 'Diet unknown'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => handleAction(req.id, 'accept')} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl font-bold transition">
                                <CheckCircle className="w-4 h-4" /> Accept
                              </button>
                              <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl font-bold transition">
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </>
                          ) : (
                            <span className={`px-4 py-1.5 rounded-xl text-sm font-bold \${req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
