"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Camera, FileText, MapPin, Calendar, PlusCircle, Building2, Check, ArrowLeft, X, ImagePlus, Users, Phone, ChevronDown, User, Mail, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  registration_closed: number;
}

export default function BusinessDashboard() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    destination: "",
    duration_days: "",
    duration_nights: "",
    tags: "", // user types comma separated
    images: [] as string[],
    brochure_url: "",
    pickup_point: "",
    drop_point: "",
    b2b_price: "",
    b2c_price: "",
    start_date: "",
  });
  const [brochureInfo, setBrochureInfo] = useState<{ name: string; size: number } | null>(null);
  const [brochureSizeError, setBrochureSizeError] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/business/trips");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
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

  const fetchBookings = async (tripId: string) => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`/api/business/trips/${tripId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleTripClick = (tripId: string) => {
    if (selectedTripId === tripId) {
      setSelectedTripId(null);
      setBookings([]);
    } else {
      setSelectedTripId(tripId);
      fetchBookings(tripId);
    }
  };

  const handleBookingAction = async (tripId: string, bookingId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/business/trips/${tripId}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchBookings(tripId);
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error performing action');
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - form.images.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setForm((f) => ({
          ...f,
          images: [...f.images, result].slice(0, 5),
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }));
  };

  const MAX_BROCHURE_SIZE_MB = 5;
  const MAX_BROCHURE_SIZE_BYTES = MAX_BROCHURE_SIZE_MB * 1024 * 1024;

  const handleBrochureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBrochureSizeError("");

    if (file.size > MAX_BROCHURE_SIZE_BYTES) {
      setBrochureSizeError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_BROCHURE_SIZE_MB} MB.`);
      setForm((f) => ({ ...f, brochure_url: "" }));
      setBrochureInfo(null);
      if (brochureInputRef.current) brochureInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm((f) => ({ ...f, brochure_url: result }));
      setBrochureInfo({ name: file.name, size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = form.title.trim() && form.description.trim() && form.destination.trim() && form.duration_days && form.images.length > 0 && form.pickup_point.trim() && form.drop_point.trim() && form.b2b_price.trim() && form.b2c_price.trim() && form.start_date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const tagsArray = form.tags.split(",").map(t => t.trim()).filter(t => t);
      const res = await fetch("/api/business/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          destination: form.destination,
          duration_days: form.duration_days,
          duration_nights: form.duration_nights,
          tags: tagsArray,
          images: form.images,
          brochure_url: form.brochure_url,
          pickup_point: form.pickup_point,
          drop_point: form.drop_point,
          b2b_price: form.b2b_price,
          b2c_price: form.b2c_price,
          start_date: form.start_date,
        }),
      });

      if (res.ok) {
        setForm({
          title: "", description: "", destination: "", duration_days: "", duration_nights: "", tags: "", images: [], brochure_url: "", pickup_point: "", drop_point: "", b2b_price: "", b2c_price: "", start_date: ""
        });
        fetchTrips();
        alert("Trip created successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create trip.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  // Parse passenger names JSON
  const parseNames = (namesStr: string): string[] => {
    try { return JSON.parse(namesStr); } catch { return []; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-screen">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pt-10 pb-20 px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Link>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Business Dashboard</h1>
            <p className="text-slate-500 mt-1">Create and manage your premium trips</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Trip Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-orange-500" /> Create a New Trip
              </h2>
              <p className="text-slate-500 mt-1">Fill out the details below to publish a new premium trip to the platform.</p>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Multi-Image Upload */}
              <div className="flex flex-col items-start mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Trip Images * <span className="text-slate-400 font-normal">({form.images.length}/5)</span></label>
                
                {/* Image Preview Grid */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-5 gap-3 w-full mb-3">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 group">
                        <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-md">Cover</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {form.images.length < 5 && (
                  <div 
                    onClick={() => imageInputRef.current?.click()}
                    className="relative w-full h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer overflow-hidden group"
                  >
                    <ImagePlus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Click to upload images ({5 - form.images.length} remaining)</span>
                  </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Trip Title *</label>
                <input required type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Alpine Adventure & Ski" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Short Description *</label>
                <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Briefly describe the experience..." className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4 text-orange-500"/> Destination *</label>
                  <input required type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Manali, Himachal Pradesh" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-500"/> Starting Date *</label>
                  <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-500"/> Days *</label>
                    <input required type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} placeholder="Days" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nights</label>
                    <input type="number" min={0} value={form.duration_nights} onChange={(e) => setForm({ ...form, duration_nights: e.target.value })} placeholder="Nights" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tags (comma-separated)</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. WinterSports, Adventure, Skiing" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup / Starting Point *</label>
                  <input required type="text" value={form.pickup_point} onChange={(e) => setForm({ ...form, pickup_point: e.target.value })} placeholder="e.g. ISBT Kashmere Gate, Delhi" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Drop / Ending Point *</label>
                  <input required type="text" value={form.drop_point} onChange={(e) => setForm({ ...form, drop_point: e.target.value })} placeholder="e.g. Mall Road, Manali" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">B2B Price *</label>
                  <input required type="text" value={form.b2b_price} onChange={(e) => setForm({ ...form, b2b_price: e.target.value })} placeholder="e.g. ₹50,000" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">B2C Price *</label>
                  <input required type="text" value={form.b2c_price} onChange={(e) => setForm({ ...form, b2c_price: e.target.value })} placeholder="e.g. ₹65,000" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Brochure (Optional PDF/Image)</label>
                <p className="text-xs text-slate-400 mb-2">Max file size: 5 MB. Supported: PDF, JPG, PNG</p>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => brochureInputRef.current?.click()} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {form.brochure_url ? "Change File" : "Upload File"}
                  </button>
                  {form.brochure_url && brochureInfo && (
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4"/> {brochureInfo.name} ({(brochureInfo.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                  {form.brochure_url && !brochureInfo && (
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4"/> File Attached</span>
                  )}
                </div>
                {brochureSizeError && (
                  <div className="mt-2 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                    <X className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-rose-600 font-medium">{brochureSizeError}</p>
                  </div>
                )}
                <input ref={brochureInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleBrochureChange} />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={submitting || !isFormValid} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Publishing...</> : "Publish Trip"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* My Trips List */}
        <div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sticky top-28">
            <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">My Published Trips</h2>
            {trips.length === 0 ? (
              <p className="text-slate-500 text-center py-6">You haven't created any trips yet.</p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {trips.map(trip => (
                  <div key={trip.id}>
                    {/* Trip Row */}
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedTripId === trip.id
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                      onClick={() => handleTripClick(trip.id)}
                    >
                      <div className="w-11 h-11 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                        {trip.image_url && <img src={trip.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate text-sm">{trip.title}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-orange-400"/> {trip.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {trip.booking_count > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                            <Users className="w-3 h-3" /> {trip.booking_count}
                          </span>
                        )}
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                          trip.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                          trip.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {trip.status}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${selectedTripId === trip.id ? "rotate-180 text-orange-500" : ""}`} />
                      </div>
                    </div>

                    {/* Booking Details Panel */}
                    {selectedTripId === trip.id && (
                      <div className="mt-2 ml-2 mr-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        {bookingsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                          </div>
                        ) : bookings.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                            <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No bookings yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3 pb-2">
                            <div className="flex items-center justify-between px-1 mb-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleRegistration(trip.id); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                  trip.registration_closed 
                                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                                    : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                }`}
                              >
                                {trip.registration_closed ? "Open Registration" : "Close Registration"}
                              </button>
                            </div>
                            <div className="flex items-center justify-between px-1">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-violet-500" /> {bookings.length} Interested
                              </span>
                              <span className="text-xs text-slate-400">
                                {bookings.reduce((s, b) => s + b.male_count + b.female_count + b.child_count, 0)} total people
                              </span>
                            </div>
                            {bookings.map((b) => {
                              const names = parseNames(b.names);
                              const totalPeople = b.male_count + b.female_count + b.child_count;
                              return (
                                <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                                  {/* Booker Info */}
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                                      {b.user_avatar ? (
                                        <img src={b.user_avatar} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        b.user_name?.charAt(0)?.toUpperCase() || "U"
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">{b.user_name}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{b.user_email}</p>
                                    </div>
                                    {b.status === 'pending' ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleBookingAction(trip.id, b.id, 'approve'); }}
                                          className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded-lg transition-all"
                                        >
                                          <CheckCircle className="w-3 h-3" /> Approve
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleBookingAction(trip.id, b.id, 'reject'); }}
                                          className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-2 py-1 rounded-lg transition-all"
                                        >
                                          <XCircle className="w-3 h-3" /> Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-rose-100 text-rose-700'
                                      }`}>
                                        {b.status}
                                      </span>
                                    )}
                                  </div>

                                  {/* People Count */}
                                  <div className="flex items-center gap-3 text-[11px] mb-2">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                                      {totalPeople} people
                                    </span>
                                    {b.male_count > 0 && <span className="text-slate-500">M: {b.male_count}</span>}
                                    {b.female_count > 0 && <span className="text-slate-500">F: {b.female_count}</span>}
                                    {b.child_count > 0 && <span className="text-slate-500">C: {b.child_count}</span>}
                                  </div>

                                  {/* Passenger Names */}
                                  {names.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {names.map((name, i) => (
                                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Contact & Date */}
                                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-1 pt-1.5 border-t border-slate-50">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {new Date(b.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
