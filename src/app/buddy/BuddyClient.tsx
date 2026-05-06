"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Calendar, User, Briefcase, Camera, Loader2, Heart, CheckCircle } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  description: string;
  destination: string;
  starting_location: string;
  trip_date: string;
  duration_days: number;
  duration_nights: number;
  image_url: string | null;
  organizer_id: string;
  organizer_name: string;
  organizer_gender: string;
  organizer_fooding_habit: string;
  organizer_profession: string;
  organizer_age: number;
  organizer_avatar: string | null;
  user_request_status: string | null;
  registration_closed: number;
}

export default function BuddyClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDuration, setFilterDuration] = useState("");
  
  // Create Form State
  const [form, setForm] = useState({
    destination: "",
    starting_location: "",
    trip_date: "",
    duration_days: "",
    duration_nights: "",
    image_url: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load trips on mount
  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/buddy");
      const data = await res.json();
      if (data.trips) {
        setTrips(data.trips);
        setCurrentUserId(data.currentUserId || "");
      }
    } catch (err) {
      console.error("Failed to fetch trips", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm((f) => ({ ...f, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Trip plan created successfully!", type: "success" });
        setForm({ destination: "", starting_location: "", trip_date: "", duration_days: "", duration_nights: "", image_url: "" });
        // Refresh feed and switch tab
        fetchTrips();
        setTimeout(() => {
          setActiveTab("search");
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ text: data.error || "Failed to create plan", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "An error occurred", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowInterest = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/request`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Interest shown successfully! The organizer will be notified.");
        // Update local state to reflect the change
        setTrips(trips.map(t => t.id === tripId ? { ...t, user_request_status: 'pending' } : t));
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("An error occurred while showing interest.");
    }
  };

  return (
    <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full">
      {/* Header & Tabs */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
          Find Your Buddy
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          Match with like-minded travelers. Create your own plan or search existing ones to show interest!
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              activeTab === "search"
                ? "bg-orange-500 text-white shadow-md"
                : "text-slate-600 hover:text-orange-500 hover:bg-orange-50"
            }`}
          >
            Search a Trip
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              activeTab === "create"
                ? "bg-orange-500 text-white shadow-md"
                : "text-slate-600 hover:text-orange-500 hover:bg-orange-50"
            }`}
          >
            Create a Plan
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-xl mb-8 flex items-center justify-center gap-2 font-medium ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {message.type === "success" && <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by destination or starting location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition"
              />
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 outline-none transition"
                title="Filter by trip date"
              />
              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 outline-none transition bg-white"
              >
                <option value="">Any Duration</option>
                <option value="1-3">1-3 Days</option>
                <option value="4-7">4-7 Days</option>
                <option value="8+">8+ Days</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
              <p>Finding buddies...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No trips found</h3>
              <p className="text-slate-500 mb-6">There are no active trip plans matching your criteria right now.</p>
              <button
                onClick={() => setActiveTab("create")}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all"
              >
                Be the first to Create a Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips
                .filter((trip) => {
                  const matchesSearch = trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        (trip.starting_location || "").toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesDate = filterDate ? trip.trip_date === filterDate : true;
                  let matchesDuration = true;
                  if (filterDuration === "1-3") matchesDuration = trip.duration_days <= 3;
                  if (filterDuration === "4-7") matchesDuration = trip.duration_days >= 4 && trip.duration_days <= 7;
                  if (filterDuration === "8+") matchesDuration = trip.duration_days >= 8;
                  
                  return matchesSearch && matchesDate && matchesDuration;
                })
                .map((trip) => {
                  const isPast = trip.trip_date ? new Date(trip.trip_date) < new Date(new Date().setHours(0,0,0,0)) : false;
                  const isClosed = trip.registration_closed === 1;
                  return (
                <div key={trip.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col group">
                  <div className="relative h-48 bg-slate-200 overflow-hidden">
                    {trip.image_url ? (
                      <img src={trip.image_url} alt={trip.destination} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-300 to-rose-300 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-col gap-1">
                      <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-400" /> To: {trip.destination}
                      </span>
                      {trip.starting_location && (
                        <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400" /> From: {trip.starting_location}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                      <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                        <Calendar className="w-3 h-3 text-orange-500" /> 
                        {trip.duration_days}D / {trip.duration_nights}N
                      </span>
                      {trip.trip_date && (
                        <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          {new Date(trip.trip_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-1">{trip.title}</h3>
                    
                    {/* Organizer Details */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold overflow-hidden shadow-inner">
                          {trip.organizer_avatar && trip.organizer_avatar !== "null" ? (
                            <img 
                              src={trip.organizer_avatar} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                              onError={() => setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, organizer_avatar: null } : t))}
                            />
                          ) : (
                            trip.organizer_name?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{trip.organizer_name}</p>
                          <p className="text-xs text-slate-500">{trip.organizer_age} yrs • {trip.organizer_gender}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                          <User className="w-3.5 h-3.5 text-orange-400" />
                          <span className="truncate">{trip.organizer_fooding_habit || "Any Diet"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                          <Briefcase className="w-3.5 h-3.5 text-rose-400" />
                          <span className="truncate capitalize">{trip.organizer_profession || "Not specified"}</span>
                        </div>
                      </div>
                    </div>

                    {trip.organizer_id === currentUserId ? (
                      <div className="mt-auto w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        Your Trip Plan
                      </div>
                    ) : isPast ? (
                      <button
                        disabled
                        className="mt-auto w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80 border border-slate-200"
                      >
                        Trip Completed
                      </button>
                    ) : isClosed ? (
                      <button
                        disabled
                        className="mt-auto w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80 border border-slate-200"
                      >
                        Registration Closed
                      </button>
                    ) : trip.user_request_status === 'pending' ? (
                      <button
                        disabled
                        className="mt-auto w-full bg-yellow-50 text-yellow-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-80 border border-yellow-200"
                      >
                        <Heart className="w-4 h-4" fill="currentColor" /> Interest Shown
                      </button>
                    ) : trip.user_request_status === 'accepted' ? (
                      <button
                        onClick={() => router.push(`/chat/${trip.id}`)}
                        className="mt-auto w-full bg-emerald-50 text-emerald-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white border border-emerald-200 group/btn"
                      >
                        <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Accepted (Go to Chat)
                      </button>
                    ) : trip.user_request_status === 'rejected' ? (
                      <button
                        disabled
                        className="mt-auto w-full bg-rose-50 text-rose-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-80 border border-rose-200"
                      >
                        Rejected by Organizer
                      </button>
                    ) : (
                      <button
                        onClick={() => handleShowInterest(trip.id)}
                        className="mt-auto w-full bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        <Heart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> Show Interest
                      </button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-orange-400 to-rose-400 flex items-center px-8">
            <h2 className="text-2xl font-bold text-white">Create a Trip Plan</h2>
          </div>
          
          <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Starting Location *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                  <input
                    type="text"
                    required
                    value={form.starting_location}
                    onChange={(e) => setForm({ ...form, starting_location: e.target.value })}
                    placeholder="e.g. Delhi, New York..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Destination Place *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                  <input
                    type="text"
                    required
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="e.g. Goa, Paris, Mount Fuji..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Trip Date *</label>
                <input
                  type="date"
                  required
                  value={form.trip_date}
                  onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Nights)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.duration_nights}
                  onChange={(e) => setForm({ ...form, duration_nights: e.target.value })}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Place Image (Optional)</label>
              <div 
                className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  form.image_url ? 'border-orange-500 bg-orange-50' : 'border-slate-300 hover:border-orange-400 bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-50" />
                    <div className="z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> Image Selected (Click to change)
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-slate-500 font-medium">Click to upload image</span>
                    <span className="text-xs text-slate-400 mt-1">JPEG, PNG, WEBP</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || !form.destination || !form.starting_location || !form.trip_date || !form.duration_days}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save and Submit Plan"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
