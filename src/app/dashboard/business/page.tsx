"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, FileText, MapPin, Calendar, PlusCircle, Building2, Check, ArrowLeft, X, ImagePlus, Users, ChevronDown, CheckCircle, XCircle, Trash2, History, ShieldAlert, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatISTDate } from "@/lib/dateUtils";
import { parseNames } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

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
  booking_status?: string | null;
  payment_status?: string | null;
  amount?: number | null;
  booking_ref?: string | null;
  razorpay_payment_id?: string | null;
}

export default function BusinessDashboard() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [providerAccount, setProviderAccount] = useState<any>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null);
  const [cancelReasonType, setCancelReasonType] = useState("Organizer Discretion");
  const [cancelReasonMessage, setCancelReasonMessage] = useState("");
  const [cancellingInProgress, setCancellingInProgress] = useState(false);
  const router = useRouter();

  const [hasStartDate, setHasStartDate] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    destination: "",
    duration_days: "",
    duration_nights: "",
    tags: "",
    images: [] as string[],
    brochure_url: "",
    pickup_point: "",
    drop_point: "",
    b2b_price: "",
    b2c_price: "",
    start_date: "",
    max_capacity: "",
  });
  const [brochureInfo, setBrochureInfo] = useState<{ name: string; size: number } | null>(null);
  const [brochureSizeError, setBrochureSizeError] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);


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
      if (data.providerAccount) {
        setProviderAccount(data.providerAccount);
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
  const fetchBookings = async (tripId: string) => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`/api/business/trips/${tripId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        const uniqueBookings = Array.from(
          new Map((data.bookings || []).map((booking: BookingData) => [booking.id, booking])).values()
        ) as BookingData[];
        setBookings(uniqueBookings);
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

  const handleRemoveTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to remove this trip? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/business/trips/${tripId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert("Trip removed successfully.");
        setSelectedTripId(null);
        setBookings([]);
        fetchTrips();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove trip.");
      }
    } catch (err) {
      console.error(err);
      alert("Error removing trip.");
    }
  };

  const handleCancelTrip = async () => {
    if (!cancellingTripId) return;
    setCancellingInProgress(true);
    try {
      const res = await fetch(`/api/business/trips/${cancellingTripId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason_type: cancelReasonType,
          reason: cancelReasonMessage || `Cancelled: ${cancelReasonType}`
        })
      });
      if (res.ok) {
        alert("Trip cancellation initiated successfully.");
        setCancelModalOpen(false);
        setCancelReasonMessage("");
        fetchTrips();
        if (selectedTripId === cancellingTripId) {
          fetchBookings(cancellingTripId);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel trip.");
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling trip.");
    } finally {
      setCancellingInProgress(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - form.images.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach(async (file) => {
      try {
        const url = await uploadToCloudinary(file, "gotogether/business-trips");
        setForm((f) => ({ ...f, images: [...f.images, url].slice(0, 5) }));
      } catch (err) {
        console.error("Trip image upload failed:", err);
        alert("Failed to upload one of the trip images.");
      }
    });

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

    const fileInfo = { name: file.name, size: file.size };
    uploadToCloudinary(file, "gotogether/business-trips")
      .then((url) => {
        setForm((f) => ({ ...f, brochure_url: url }));
        setBrochureInfo(fileInfo);
      })
      .catch((err) => {
        console.error("Brochure upload failed:", err);
        setBrochureSizeError("Failed to upload brochure. Please try again.");
        setBrochureInfo(null);
      });
  };

  const isFormValid = form.title.trim() && form.description.trim() && form.destination.trim() && form.duration_days && form.images.length > 0 && form.pickup_point.trim() && form.drop_point.trim() && form.b2b_price.trim() && form.b2c_price.trim() && (!hasStartDate || form.start_date);

  const handleSubmit = async (e: { preventDefault(): void }) => {
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
          max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        }),
      });

      if (res.ok) {
        setForm({
          title: "", description: "", destination: "", duration_days: "", duration_nights: "", tags: "", images: [], brochure_url: "", pickup_point: "", drop_point: "", b2b_price: "", b2c_price: "", start_date: "", max_capacity: ""
        });
        setHasStartDate(true);
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

  const filteredTrips = trips.filter(trip => {
    const isPast = trip.start_date ? new Date(trip.start_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
    const isDeleted = trip.status === 'deleted';
    return showHistory ? (isPast || isDeleted) : (!isPast && !isDeleted);
  });

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

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Business Dashboard</h1>
            <p className="text-white/70 mt-1">Create and manage your premium trips</p>
          </div>
        </div>
      </div>

      {providerAccount && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Gateway:</span>
              <strong className="text-sm text-slate-800 font-extrabold">{providerAccount.provider}</strong>
            </div>
            <div className="text-xs text-slate-500 font-semibold flex flex-wrap gap-4 mt-1">
              {providerAccount.last_verified_at && (
                <span>Last API verification: {new Date(providerAccount.last_verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {providerAccount.last_webhook_received_at && (
                <span>Last Webhook signal: {new Date(providerAccount.last_webhook_received_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {providerAccount.credential_status === 'verified' && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 shadow-sm">
                <Check className="w-3.5 h-3.5" /> Verified Gateway
              </span>
            )}
            {providerAccount.credential_status === 'failed' && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-100 shadow-sm animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" /> Credentials Expired / Invalid
              </span>
            )}
            {providerAccount.metadata?.webhook_health === 'inactive_30d' && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-100 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5" /> Webhook Misconfigured / Inactive (30d)
              </span>
            )}
            {providerAccount.rotation_required && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-800 text-xs font-bold rounded-xl border border-yellow-200">
                Rotation Required
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Trip Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="relative p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-orange-50/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-6 h-6 text-orange-500" /> Create a New Trip
                </h2>
                <p className="text-slate-500 mt-1">Fill out the details below to publish a new premium trip.</p>
              </div>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4 text-orange-500" /> Destination *</label>
                  <input required type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Manali, Himachal Pradesh" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-500" /> Does this trip have a fixed starting date?</label>
                  <div className="flex gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => setHasStartDate(true)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${hasStartDate ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                    >
                      Yes, fixed date
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHasStartDate(false); setForm((f) => ({ ...f, start_date: "" })); }}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${!hasStartDate ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                    >
                      No, flexible dates
                    </button>
                  </div>
                  {hasStartDate && (
                    <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                  )}
                  {!hasStartDate && (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                      Travellers will choose their own date. Your listed price applies to all dates.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4 text-orange-500" /> Days *</label>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">B2B Price *</label>
                  <input required type="text" value={form.b2b_price} onChange={(e) => setForm({ ...form, b2b_price: e.target.value })} placeholder="e.g. INR 50,000" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">B2C Price *</label>
                  <input required type="text" value={form.b2c_price} onChange={(e) => setForm({ ...form, b2c_price: e.target.value })} placeholder="e.g. INR 65,000" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Max Seats <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" min={1} value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} placeholder="e.g. 20" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium" />
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
                      <Check className="w-4 h-4" /> {brochureInfo.name} ({(brochureInfo.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                  {form.brochure_url && !brochureInfo && (
                    <span className="text-sm font-medium text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" /> File Attached</span>
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
                <button type="submit" disabled={submitting || !isFormValid} className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Publishing...</> : "Publish Trip"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* My Trips List */}
        <div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sticky top-28">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-orange-500" /> Published Trips</h2>
            
            {/* Tabs for Active vs History */}
            <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-xl border border-slate-150">
              <button
                type="button"
                onClick={() => { setShowHistory(false); setSelectedTripId(null); setBookings([]); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!showHistory ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                Active Trips
              </button>
              <button
                type="button"
                onClick={() => { setShowHistory(true); setSelectedTripId(null); setBookings([]); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${showHistory ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                <History className="w-3.5 h-3.5" /> History
              </button>
            </div>

            {filteredTrips.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">
                {showHistory ? "No completed trips in history." : "You haven't created any active trips yet."}
              </p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTrips.map(trip => (
                  <div key={trip.id}>
                    {/* Trip Row */}
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedTripId === trip.id
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50"
                        }`}
                      onClick={() => handleTripClick(trip.id)}
                    >
                      <div className="relative w-11 h-11 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                        {trip.image_url && <Image src={trip.image_url} alt="" fill className="object-cover" sizes="44px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate text-sm">{trip.title}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-orange-400" /> {trip.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {trip.booking_count > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                            <Users className="w-3 h-3" /> {trip.booking_count}
                          </span>
                        )}
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${trip.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
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
                            <div className="flex items-center justify-between gap-2 px-1 mb-3">
                              {!['cancelling', 'refunds_processing', 'refunds_completed', 'cancelled'].includes(trip.status) ? (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleRegistration(trip.id); }}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${trip.registration_closed
                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                        : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                      }`}
                                  >
                                    {trip.registration_closed ? "Open" : "Close"} Reg.
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCancellingTripId(trip.id); setCancelModalOpen(true); }}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition flex items-center justify-center gap-1 shrink-0"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel Trip
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveTrip(trip.id); }}
                                  className="w-full px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition flex items-center justify-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove Trip
                                </button>
                              )}
                            </div>

                            {['cancelling', 'refunds_processing', 'refunds_completed', 'cancelled'].includes(trip.status) && (
                              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                                  <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-rose-500" /> Cancellation Progress</span>
                                  <span className="uppercase tracking-wider px-2 py-0.5 bg-rose-100 rounded-full text-[9px]">{trip.status.replace('_', ' ')}</span>
                                </div>

                                {(() => {
                                  const total = bookings.length;
                                  const completed = bookings.filter(b => b.payment_status === 'refunded').length;
                                  const failed = bookings.filter(b => b.payment_status === 'refund_failed' || b.payment_status === 'failed').length;
                                  const processing = total - completed - failed;
                                  const pct = total > 0 ? Math.round((completed / total) * 100) : 100;

                                  return (
                                    <div className="space-y-2.5">
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                                          <span>Refund Progress</span>
                                          <span>{pct}% ({completed}/{total})</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white/80 p-2 rounded-lg border border-slate-100/50">
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Refunded</p>
                                          <p className="text-sm font-extrabold text-emerald-600">{completed}</p>
                                        </div>
                                        <div className="bg-white/80 p-2 rounded-lg border border-slate-100/50">
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Processing</p>
                                          <p className="text-sm font-extrabold text-amber-600">{processing}</p>
                                        </div>
                                        <div className="bg-white/80 p-2 rounded-lg border border-slate-100/50">
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Failed</p>
                                          <p className="text-sm font-extrabold text-rose-600">{failed}</p>
                                        </div>
                                      </div>

                                      {failed > 0 && (
                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100/50 text-[10px] text-rose-700">
                                          <span>Some refunds failed.</span>
                                          <button 
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const res = await fetch(`/api/cron/reconcile`, { method: 'POST' });
                                                if (res.ok) alert("Retry reconcile triggered.");
                                              } catch {}
                                            }}
                                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition"
                                          >
                                            Retry
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
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
                                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                                      {b.user_avatar ? (
                                        <Image src={b.user_avatar} alt="" fill className="object-cover" sizes="32px" />
                                      ) : (
                                        b.user_name?.charAt(0)?.toUpperCase() || "U"
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-900 truncate">{b.user_name}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{b.user_email}</p>
                                    </div>
                                    {b.booking_status ? (
                                      <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                          b.booking_status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' :
                                          b.booking_status === 'pending_payment' ? 'bg-amber-100 text-amber-700 border border-amber-200/50 animate-pulse' :
                                          b.booking_status === 'expired' ? 'bg-slate-100 text-slate-500 border border-slate-200/50' :
                                          'bg-rose-100 text-rose-700 border border-rose-200/50'
                                        }`}>
                                          {b.booking_status === 'pending_payment' ? 'Awaiting Payment' : b.booking_status}
                                        </span>
                                        {b.booking_ref && (
                                          <span className="text-[9px] font-mono text-slate-400 font-bold">Ref: {b.booking_ref}</span>
                                        )}
                                      </div>
                                    ) : b.status === 'pending' ? (
                                      <div className="flex items-center gap-1.5 shrink-0">
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
                                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
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
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-400 mt-1.5 pt-2 border-t border-slate-50">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Calendar className="w-3 h-3" /> {formatISTDate(b.trip_date)}
                                    </span>
                                    {b.amount ? (
                                      <span className={`font-bold ${b.payment_status === 'paid' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {b.payment_status === 'paid' ? 'Paid' : 'Amount'}: INR {(b.amount / 100).toLocaleString('en-IN')}
                                      </span>
                                    ) : null}
                                    {b.razorpay_payment_id && (
                                      <span className="font-mono text-slate-400">
                                        Pay ID: {b.razorpay_payment_id}
                                      </span>
                                    )}
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

      {/* Cancel Trip Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" /> Cancel Business Trip
              </h3>
              <button 
                type="button" 
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason Category</label>
                <select 
                  value={cancelReasonType} 
                  onChange={(e) => setCancelReasonType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-sm text-slate-800 bg-white"
                >
                  <option value="Organizer Discretion">Organizer Discretion</option>
                  <option value="Severe Weather">Severe Weather</option>
                  <option value="Logistical Issues">Logistical Issues</option>
                  <option value="Unforeseen Emergency">Unforeseen Emergency</option>
                  <option value="Low Registration">Low Registration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Cancellation Message</label>
                <textarea 
                  value={cancelReasonMessage} 
                  onChange={(e) => setCancelReasonMessage(e.target.value)}
                  placeholder="Explain why the trip is being cancelled. This will be sent to all registered travelers and shown in their dashboards."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all font-medium text-sm text-slate-800 placeholder-slate-400 resize-none"
                />
              </div>

              <div className="bg-rose-50 border border-rose-150 rounded-2xl p-3 flex items-start gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">This action is irreversible.</p>
                  <p className="text-rose-700">All bookings will be cancelled and 100% automatic refunds will be processed for paid travelers.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-150">
              <button 
                type="button" 
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                No, Go Back
              </button>
              <button 
                type="button" 
                disabled={cancellingInProgress}
                onClick={handleCancelTrip}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {cancellingInProgress ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  "Confirm Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
