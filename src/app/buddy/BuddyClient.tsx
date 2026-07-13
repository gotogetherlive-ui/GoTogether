"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Calendar, Briefcase, Camera, Loader2, Heart, CheckCircle, Utensils, Users, Sparkles, Wallet, Globe, Compass, X } from "lucide-react";
import Image from "next/image";
import CompatibilityWizard from "@/components/CompatibilityWizard";
import BudgetEditor from "@/components/BudgetEditor";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

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
  match_score: number;
  accepted_count: number;
  match_breakdown?: any[];
  common_activities?: string[];
  common_languages?: string[];
  organizer_travel_style?: string | null;
  organizer_food_pref?: string | null;
  organizer_languages?: string | null;
}

export default function BuddyClient({
  isAuthenticated,
  hasCompletedProfile,
}: {
  isAuthenticated: boolean;
  hasCompletedProfile: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDuration, setFilterDuration] = useState("");
  const [filterGender, setFilterGender] = useState("");

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

  // Edit / Delete State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({
    starting_location: "",
    destination: "",
    trip_date: "",
    duration_days: "",
    duration_nights: "",
    image_url: "",
  });
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMatchTrip, setSelectedMatchTrip] = useState<Trip | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userBudget, setUserBudget] = useState<any>(null);
  const [hasCompatibilityProfile, setHasCompatibilityProfile] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(isAuthenticated);

  const fetchCompatibilityStatus = async () => {
    try {
      const res = await fetch("/api/compatibility");
      if (res.ok) {
        const data = await res.json();
        setHasCompatibilityProfile(data.hasProfile);
        if (data.profile) {
          setUserProfile({
            ...data.profile,
            activity_preferences: typeof data.profile.activity_preferences === 'string'
              ? JSON.parse(data.profile.activity_preferences)
              : data.profile.activity_preferences || [],
            languages: typeof data.profile.languages === 'string'
              ? JSON.parse(data.profile.languages)
              : data.profile.languages || [],
          });
        } else {
          setUserProfile(null);
        }
        setUserBudget(data.budget || null);
      }
    } catch (err) {
      console.error("Failed to fetch compatibility status", err);
    } finally {
      setLoadingProfile(false);
    }
  };
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/buddy");
      const data = await res.json();
      if (data.trips) {
        setTrips(data.trips);
        setCurrentUserId(data.currentUserId || "");
        if (data.hasOwnProperty('hasCompatibilityProfile')) {
          setHasCompatibilityProfile(data.hasCompatibilityProfile);
        }
      }
    } catch (err) {
      console.error("Failed to fetch trips", err);
    } finally {
      setLoading(false);
    }
  };
  // Load trips on mount
  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompatibilityStatus();
    } else {
      setLoadingProfile(false);
    }
  }, [isAuthenticated]);

  const handleWizardComplete = () => {
    setShowWizard(false);
    fetchCompatibilityStatus();
    fetchTrips();
  };

  const handleBudgetSaved = () => {
    setShowBudgetEditor(false);
    fetchCompatibilityStatus();
    fetchTrips();
  };

  const handleEditClick = (trip: Trip) => {
    setEditingTrip(trip);
    setEditForm({
      starting_location: trip.starting_location || "",
      destination: trip.destination || "",
      trip_date: trip.trip_date || "",
      duration_days: trip.duration_days?.toString() || "",
      duration_nights: trip.duration_nights?.toString() || "",
      image_url: trip.image_url || "",
    });
  };

  const handleEditImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file, "gotogether/buddy");
      setEditForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      console.error("Buddy image upload failed:", err);
      alert("Failed to upload image.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/buddy/${editingTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Trip plan updated successfully!");
        setEditingTrip(null);
        fetchTrips();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to update trip plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!editingTrip) return;
    if (!confirm("Are you sure you want to delete this trip plan? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/buddy/${editingTrip.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("Trip plan deleted successfully!");
        setEditingTrip(null);
        fetchTrips();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to delete trip plan.");
    } finally {
      setSubmitting(false);
    }
  };



  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToCloudinary(file, "gotogether/buddy");
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      console.error("Buddy image upload failed:", err);
      alert("Failed to upload image.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        // Refresh the feed and keep the saved-budget confirmation visible.
        fetchTrips();
        setActiveTab("search");
        requestAnimationFrame(() => {
          messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } else {
        setMessage({ text: data.error || "Failed to create plan", type: "error" });
      }
    } catch {
      setMessage({ text: "An error occurred", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const requireBuddyAccess = () => {
    if (!isAuthenticated) {
      router.push("/login?next=/buddy");
      return false;
    }
    if (!hasCompletedProfile) {
      alert("Please complete your profile before using Find Buddy.");
      router.push("/dashboard");
      return false;
    }
    if (!hasCompatibilityProfile) {
      setShowWizard(true);
      return false;
    }
    return true;
  };

  const openCreatePlan = () => {
    if (requireBuddyAccess()) {
      setMessage(null);
      setActiveTab("create");
    }
  };

  const handleShowInterest = async (tripId: string) => {
    if (!requireBuddyAccess()) return;
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
    } catch {
      alert("An error occurred while showing interest.");
    }
  };

  // â”€â”€â”€ Loading Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loadingProfile || (loading && trips.length === 0)) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 animate-pulse" />
          <Loader2 className="w-8 h-8 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-500 font-semibold animate-pulse">Initializing buddy matching...</p>
      </main>
    );
  }

  // â”€â”€â”€ Mandatory Onboarding Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAuthenticated && !hasCompletedProfile) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="max-w-xl rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl">
          <h2 className="text-3xl font-extrabold text-slate-900">Complete Your Profile</h2>
          <p className="mt-3 text-slate-600">Complete your dashboard profile before creating plans, showing interest, or starting Travel DNA.</p>
          <button onClick={() => router.push("/dashboard")} className="mt-6 rounded-2xl bg-orange-500 px-7 py-3.5 font-bold text-white">Complete Profile</button>
        </div>
      </main>
    );
  }

  if (isAuthenticated && !hasCompatibilityProfile) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100/80 max-w-2xl text-center relative overflow-hidden animate-slide-up">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-400 via-rose-500 to-pink-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-orange-500/25">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Unlock Buddy Match Scores!
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
              Find compatible travel companions by taking a quick, interactive quiz. Share your vibe, style, and budget to view real-time match scores.
            </p>

            <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100/50 text-left space-y-3 max-w-md mx-auto">
              <h4 className="text-xs font-bold text-orange-800 uppercase tracking-widest">DNA quiz unlocks:</h4>
              <ul className="space-y-2 text-sm text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">OK</span>
                  11-factor weighted compatibility engine
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">OK</span>
                  Overlapping trip budget matches
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">OK</span>
                  Detailed match breakdowns per trip organizer
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowWizard(true)}
              className="w-full max-w-md bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all text-base cursor-pointer"
            >
              Start Travel DNA Quiz
            </button>
          </div>
        </div>

        {showWizard && (
          <CompatibilityWizard
            onComplete={handleWizardComplete}
            showBudgetStep={true}
          />
        )}
      </main>
    );
  }

  return (
    <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-8 md:p-12 mb-10 shadow-xl shadow-orange-500/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 border border-white/10">
            <Heart className="w-3.5 h-3.5" /> Find Your Travel Companion
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Find Your Buddy
          </h1>
          <p className="text-white/75 max-w-2xl mx-auto text-lg">
            Match with like-minded travelers. Create your own plan or search existing ones to show interest!
          </p>

          <div className="flex justify-center mt-8">
            <div className="inline-flex bg-white/15 backdrop-blur-sm p-1.5 rounded-2xl border border-white/20">
              <button
                onClick={() => setActiveTab("search")}
                className={`px-7 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "search"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <Search className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Search Trips
              </button>
              <button
                onClick={openCreatePlan}
                className={`px-7 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "create"
                    ? "bg-white text-orange-600 shadow-lg"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
              >
                <Camera className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Create Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-center shadow-sm md:flex-row md:text-left">
          <div>
            <p className="font-extrabold text-slate-900">Preview Find Buddy trips</p>
            <p className="text-sm text-slate-600">Sign in, complete your profile, and finish Travel DNA to create a plan, see match scores, or show interest.</p>
          </div>
          <button onClick={() => router.push("/login?next=/buddy")} className="shrink-0 rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow-md hover:bg-orange-600">Sign In to Continue</button>
        </div>
      )}

      {/* Compatibility DNA Status Bar */}
      {hasCompatibilityProfile && activeTab === "search" && (
        <div className="bg-white/90 backdrop-blur-md border border-slate-100 rounded-3xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Your Compatibility Profile is Active!</p>
              <p className="text-xs text-slate-500">Trip feed is sorted to show your highest compatibility matches first.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Edit Travel DNA
            </button>
            <button
              onClick={() => setShowBudgetEditor(true)}
              className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Wallet className="w-3.5 h-3.5 text-rose-500" /> Edit Budget (INR)
            </button>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {message && (
        <div
          ref={messageRef}
          role={message.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mb-8 rounded-3xl border p-5 shadow-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
        >
          <div className="flex items-start gap-3">
            {message.type === "success" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={`font-extrabold ${message.type === "success" ? "text-emerald-900" : "text-rose-800"}`}>
                {message.text}
              </p>
              {message.type === "success" && (
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-700">
                    {userBudget?.budget_min && userBudget?.budget_max ? (
                      <>
                        Your current desired budget is <strong className="whitespace-nowrap text-slate-950">₹{Number(userBudget.budget_min).toLocaleString("en-IN")} – ₹{Number(userBudget.budget_max).toLocaleString("en-IN")}</strong> per trip. You can change it anytime.
                      </>
                    ) : (
                      <>You have not set a desired trip budget yet. Add one to improve your buddy matches.</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBudgetEditor(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Wallet className="h-4 w-4" />
                    {userBudget ? "Edit budget" : "Set budget"}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              aria-label="Dismiss message"
              className={`rounded-lg p-1.5 transition ${message.type === "success" ? "text-emerald-700 hover:bg-emerald-100" : "text-rose-700 hover:bg-rose-100"}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-6 transform transition-all animate-slide-up">
          {/* Search and Filters - Upgraded Floating Deck */}
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-slate-100/90 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by destination or starting location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="premium-input-icon peer"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500 transition-transform duration-300 peer-focus:scale-110 peer-focus:rotate-6 pointer-events-none" />
              </div>
              <div className="flex flex-wrap gap-2.5">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="premium-select"
                  title="Filter by trip date"
                />
                <select value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)}
                  className="premium-select">
                  <option value="">Duration</option>
                  <option value="1-3">1-3 Days</option>
                  <option value="4-7">4-7 Days</option>
                  <option value="8+">8+ Days</option>
                </select>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}
                  className="premium-select">
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 animate-pulse" />
                <Loader2 className="w-8 h-8 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-slate-500 font-medium">Finding your perfect buddies...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full blur-3xl opacity-60 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No trips found</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Be the first to create a trip plan and find your travel companion!</p>
                <button
                  onClick={openCreatePlan}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Create a Plan
                </button>
              </div>
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

                  const matchesGender = filterGender ? trip.organizer_gender === filterGender : true;

                  // Hide completed (past) trips for everyone except the organizer themselves
                  const isPast = trip.trip_date ? new Date(trip.trip_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
                  const isOrganizer = trip.organizer_id === currentUserId;
                  if (isPast && !isOrganizer) return false;

                  return matchesSearch && matchesDate && matchesDuration && matchesGender;
                })
                .map((trip) => {
                  const isPast = trip.trip_date ? new Date(trip.trip_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
                  const isClosed = trip.registration_closed === 1;
                  return (
                    <div key={trip.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col group">
                      <div className="relative h-52 bg-slate-200 overflow-hidden">
                        {trip.image_url ? (
                          <Image src={trip.image_url} alt={`${trip.title} trip image in ${trip.destination}`} fill className="object-cover group-hover:scale-110 transition-transform duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 flex items-center justify-center">
                            <MapPin className="w-14 h-14 text-white/30" />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10">
                            <MapPin className="w-3 h-3 text-orange-300" /> {trip.destination}
                          </span>
                          {trip.starting_location && (
                            <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10">
                              <MapPin className="w-3 h-3 text-sky-300" /> From: {trip.starting_location}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Calendar className="w-3 h-3 text-orange-500" />
                            {trip.duration_days}D / {trip.duration_nights}N
                          </span>
                          {currentUserId && trip.organizer_id !== currentUserId && hasCompatibilityProfile && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedMatchTrip(trip); }}
                              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shrink-0 ${
                                  trip.match_score >= 80 ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                                  trip.match_score >= 50 ? 'bg-amber-500 text-white hover:bg-amber-600' :
                                  'bg-slate-500 text-white hover:bg-slate-600'
                                }`}
                              title="Click to view compatibility details"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-white" />
                              {trip.match_score}% match
                            </button>
                          )}
                        </div>
                        {/* Bottom info overlay */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 drop-shadow-md">{trip.title}</h3>
                          {trip.trip_date && (
                            <span className="text-white/80 text-xs font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(trip.trip_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        {/* Organizer Details & Compatibility Badges */}
                        <div className="bg-gradient-to-r from-slate-50 to-orange-50/30 rounded-2xl p-4 border border-slate-100/80 mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold overflow-hidden shadow-md shadow-orange-500/20 shrink-0">
                              {trip.organizer_avatar && trip.organizer_avatar !== "null" ? (
                                <Image
                                  src={trip.organizer_avatar}
                                  alt={`${trip.organizer_name} profile image`}
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                  onError={() => setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, organizer_avatar: null } : t))}
                                />
                              ) : (
                                trip.organizer_name?.charAt(0)?.toUpperCase() || "U"
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{trip.organizer_name}</p>
                              <p className="text-xs text-slate-500">{trip.organizer_age} yrs / {trip.organizer_gender}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 px-2 py-1.5 rounded-lg border border-slate-100" title="Diet preference">
                              <Utensils className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span className="truncate">{trip.organizer_food_pref || trip.organizer_fooding_habit || "Any Diet"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 px-2 py-1.5 rounded-lg border border-slate-100" title="Profession">
                              <Briefcase className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="truncate capitalize">{trip.organizer_profession || "Not specified"}</span>
                            </div>
                            {trip.organizer_travel_style && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 px-2 py-1.5 rounded-lg border border-slate-100" title="Travel Style">
                                <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate">{trip.organizer_travel_style}</span>
                              </div>
                            )}
                            {trip.organizer_languages && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/80 px-2 py-1.5 rounded-lg border border-slate-100" title="Languages Spoken">
                                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">
                                  {(() => {
                                    try {
                                      const langs = typeof trip.organizer_languages === 'string'
                                        ? JSON.parse(trip.organizer_languages)
                                        : trip.organizer_languages;
                                      return Array.isArray(langs) ? langs.slice(0, 2).join(', ') : 'Not specified';
                                    } catch {
                                      return 'Not specified';
                                    }
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Common Activities Tags (if matching and has profile) */}
                          {hasCompatibilityProfile && trip.common_activities && trip.common_activities.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/50">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shared Interests</p>
                              <div className="flex flex-wrap gap-1">
                                {trip.common_activities.slice(0, 3).map((act: string) => (
                                  <span key={act} className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100/80 px-2 py-0.5 rounded-md">
                                    {act}
                                  </span>
                                ))}
                                {trip.common_activities.length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                    +{trip.common_activities.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {trip.organizer_id === currentUserId ? (
                          <div className="mt-auto flex flex-col gap-2 w-full">
                            <div className="w-full bg-slate-50 text-slate-500 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 ring-1 ring-slate-200 text-xs">
                              Your Trip Plan
                            </div>
                            {trip.accepted_count > 0 && (
                              <button
                                onClick={() => router.push(`/chat/${trip.id}`)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 hover:shadow-lg text-sm"
                              >
                                <CheckCircle className="w-4 h-4" /> Go to Chat
                              </button>
                            )}
                            <button
                              onClick={() => handleEditClick(trip)}
                              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10 hover:shadow-lg hover:-translate-y-0.5 text-sm"
                            >
                              Edit Plan
                            </button>
                          </div>
                        ) : isPast ? (
                          <button disabled className="mt-auto w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ring-1 ring-slate-200 text-sm">
                            Trip Completed
                          </button>
                        ) : isClosed ? (
                          <button disabled className="mt-auto w-full bg-slate-50 text-slate-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ring-1 ring-slate-200 text-sm">
                            Registration Closed
                          </button>
                        ) : trip.user_request_status === 'pending' ? (
                          <button disabled className="mt-auto w-full bg-amber-50 text-amber-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ring-1 ring-amber-200 text-sm">
                            <Heart className="w-4 h-4" fill="currentColor" /> Interest Shown
                          </button>
                        ) : trip.user_request_status === 'accepted' ? (
                          <button
                            onClick={() => router.push(`/chat/${trip.id}`)}
                            className="mt-auto w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg text-sm"
                          >
                            <CheckCircle className="w-4 h-4" /> Accepted - Go to Chat
                          </button>
                        ) : trip.user_request_status === 'rejected' ? (
                          <button disabled className="mt-auto w-full bg-rose-50 text-rose-500 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed ring-1 ring-rose-200 text-sm">
                            Rejected by Organizer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleShowInterest(trip.id)}
                            className="mt-auto w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 hover:shadow-lg hover:-translate-y-0.5 text-sm"
                          >
                            <Heart className="w-4 h-4" /> Show Interest
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100/80 overflow-hidden transform transition-all animate-slide-up">
          <div className="relative h-28 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 flex items-center px-8 md:px-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Create a Trip Plan</h2>
              <p className="text-white/80 text-sm mt-1">Share your travel dream and connect with the perfect buddies</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-8 md:p-10 space-y-8 bg-slate-50/50">
            {/* Step 1: Route Details */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-sky-400 to-orange-400" />
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-extrabold">1</span>
                Route Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="hidden md:block absolute left-1/2 top-[55px] -translate-x-1/2 w-8 border-t-2 border-dashed border-slate-200 z-0 pointer-events-none group-focus-within:border-orange-300 transition-colors" />
                
                <div className="relative z-10">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Starting Location *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={form.starting_location}
                      onChange={(e) => setForm({ ...form, starting_location: e.target.value })}
                      placeholder="e.g. Delhi, New York..."
                      className="premium-input-icon peer"
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 transition-transform duration-300 peer-focus:scale-110 peer-focus:rotate-12 pointer-events-none" />
                  </div>
                </div>
                <div className="relative z-10">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Destination Place *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      placeholder="e.g. Goa, Paris..."
                      className="premium-input-icon peer"
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 transition-transform duration-300 peer-focus:scale-110 peer-focus:-rotate-12 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Timing & Duration */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-rose-400" />
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-extrabold">2</span>
                Timing & Duration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Trip Date *</label>
                  <input
                    type="date"
                    required
                    value={form.trip_date}
                    onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Days *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    placeholder="e.g. 5"
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Nights *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.duration_nights}
                    onChange={(e) => setForm({ ...form, duration_nights: e.target.value })}
                    placeholder="e.g. 4"
                    className="premium-input"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Media Upload */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-400 to-pink-500" />
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-extrabold">3</span>
                Cover Image (Optional)
              </h3>
              
              <div
                className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${form.image_url ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 hover:border-orange-400 hover:bg-slate-50 bg-slate-50/50'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {form.image_url ? (
                  <>
                    <Image src={form.image_url} alt="New buddy trip cover image preview" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover transition-transform duration-500 hover:scale-105" />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center transition-opacity hover:opacity-100 opacity-90">
                      <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl font-bold text-slate-900 shadow-md flex items-center gap-2 text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce" /> Image Selected (Click to change)
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-3 text-orange-500 border border-orange-100 group-hover:scale-110 transition-transform duration-300">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-slate-700 font-bold text-sm">Click to upload cover image</span>
                    <span className="text-xs text-slate-400 mt-1">JPEG, PNG, WEBP formats supported</span>
                  </div>
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
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving your plan...
                  </>
                ) : (
                  "Share & Find Companions"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/70 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 max-w-lg w-full max-h-[90vh] flex flex-col transform transition-all animate-slide-up">
            <div className="relative h-24 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 flex items-center px-8 md:px-10 overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
              <h2 className="text-xl md:text-2xl font-extrabold text-white relative z-10">Edit Trip Plan</h2>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-5 relative shadow-sm">
                  <div className="absolute left-9 top-14 bottom-14 w-0.5 border-l-2 border-dashed border-slate-300 pointer-events-none" />
                  
                  <div className="relative z-10">
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Starting Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.starting_location}
                        onChange={(e) => setEditForm({ ...editForm, starting_location: e.target.value })}
                        placeholder="e.g. Delhi, New York..."
                        className="premium-input-icon peer"
                      />
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 transition-transform duration-300 peer-focus:scale-110 peer-focus:rotate-12 pointer-events-none" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Destination Place</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.destination}
                        onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                        placeholder="e.g. Goa, Paris..."
                        className="premium-input-icon peer"
                      />
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 transition-transform duration-300 peer-focus:scale-110 peer-focus:-rotate-12 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-5 shadow-sm">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Trip Date</label>
                    <input
                      type="date"
                      value={editForm.trip_date}
                      onChange={(e) => setEditForm({ ...editForm, trip_date: e.target.value })}
                      className="premium-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Days</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.duration_days}
                        onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })}
                        placeholder="e.g. 5"
                        className="premium-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Nights</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.duration_nights}
                        onChange={(e) => setEditForm({ ...editForm, duration_nights: e.target.value })}
                        placeholder="e.g. 4"
                        className="premium-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4 shadow-sm">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Cover Image (Optional)</label>
                  <div
                    className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${editForm.image_url ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 hover:border-orange-400 hover:bg-slate-50 bg-slate-50/50'
                      }`}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {editForm.image_url ? (
                      <>
                        <Image src={editForm.image_url} alt="Edited buddy trip cover image preview" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover transition-transform duration-500 hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center transition-opacity hover:opacity-100 opacity-90">
                          <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl font-bold text-slate-900 shadow-md flex items-center gap-2 text-xs">
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> Image Selected (Click to change)
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-2 text-orange-500 border border-orange-100">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-slate-700 font-bold text-xs">Click to upload cover image</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WEBP formats</span>
                      </div>
                    )}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditImageFile}
                    />
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8 pt-5 border-t border-slate-100/80 flex flex-col sm:flex-row gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={submitting}
                  className="px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl transition disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
                >
                  Delete Plan
                </button>
                <div className="flex-1 flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingTrip(null)}
                    disabled={submitting}
                    className="px-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl transition disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (!editForm.destination.trim() && !editForm.starting_location.trim() && !editForm.trip_date.trim() && !editForm.duration_days.trim() && !editForm.duration_nights.trim() && !editForm.image_url.trim())}
                    className="px-7 py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-50 text-sm"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Compatibility Modal */}
      {selectedMatchTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 max-w-lg w-full max-h-[90vh] flex flex-col transform transition-all animate-slide-up p-8 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedMatchTrip(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center font-bold text-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 flex items-center justify-center text-white mb-3 shadow-md shadow-orange-500/20">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Vibe Compatibility</h3>
              <p className="text-xs text-slate-400 mt-1">Between you and {selectedMatchTrip.organizer_name}</p>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto my-5 py-2 pr-1 space-y-6 custom-scrollbar">
              
              {/* Circular Progress Indicator */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      stroke="url(#matchGrad)" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={352}
                      strokeDashoffset={352 - (352 * selectedMatchTrip.match_score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold text-slate-950">{selectedMatchTrip.match_score}%</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Match</span>
                  </div>
                </div>
                
                {/* Personalized vibe text */}
                <p className="text-slate-500 text-sm leading-relaxed mt-4 font-medium italic max-w-sm text-center">
                  {selectedMatchTrip.match_score >= 80 ? (
                    `"You and ${selectedMatchTrip.organizer_name} have a phenomenal match! Your travel styles and preferences align beautifully. Send a request to connect!"`
                  ) : selectedMatchTrip.match_score >= 50 ? (
                    `"You share some great core preferences with ${selectedMatchTrip.organizer_name}. A few differences will make for a fun, balanced journey together!"`
                  ) : (
                    `"Different styles make for the best stories! Learning from traveler perspectives can make your trip even more memorable."`
                  )}
                </p>
              </div>

              {/* Match Breakdown list */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/80 space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-2">DNA Breakdown</h4>
                {selectedMatchTrip.match_breakdown && selectedMatchTrip.match_breakdown.length > 0 ? (
                  selectedMatchTrip.match_breakdown.map((item: any) => (
                    <div key={item.dimension} className="space-y-1.5 pb-3 last:pb-0 border-b border-slate-200/40 last:border-0">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <span className={`font-bold text-[11px] ${item.score >= 70 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {item.score}% Compatibility
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>You: <strong className="text-slate-600 capitalize">{item.userAValue || 'Not set'}</strong></span>
                        <span>Them: <strong className="text-slate-600 capitalize">{item.userBValue || 'Not set'}</strong></span>
                      </div>
                      {/* Progress bar */}
                      <div className="relative h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                        <div 
                          className={`absolute h-full rounded-full transition-all duration-500 ${
                            item.score >= 80 ? 'bg-emerald-500' : 
                            item.score >= 50 ? 'bg-amber-400' : 
                            'bg-slate-400'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No breakdown data available.</p>
                )}
              </div>

              {/* Shared Activities & Languages Badges */}
              {((selectedMatchTrip.common_activities && selectedMatchTrip.common_activities.length > 0) || 
                (selectedMatchTrip.common_languages && selectedMatchTrip.common_languages.length > 0)) && (
                <div className="bg-orange-50/20 p-5 rounded-3xl border border-orange-100/30 space-y-4">
                  {selectedMatchTrip.common_activities && selectedMatchTrip.common_activities.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-2">Common Activity Interests</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMatchTrip.common_activities.map((act: string) => (
                          <span key={act} className="text-xs font-bold text-orange-700 bg-orange-100/60 px-2.5 py-1 rounded-lg">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedMatchTrip.common_languages && selectedMatchTrip.common_languages.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-2">Shared Languages Spoken</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMatchTrip.common_languages.map((lang: string) => (
                          <span key={lang} className="text-xs font-bold text-rose-700 bg-rose-100/60 px-2.5 py-1 rounded-lg">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky request button */}
            <div className="pt-4 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => {
                  handleShowInterest(selectedMatchTrip.id);
                  setSelectedMatchTrip(null);
                }}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-xl active:scale-95 transition-all text-sm cursor-pointer"
              >
                Send Request to Join Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compatibility Wizard Modal */}
      {showWizard && (
        <CompatibilityWizard
          onComplete={handleWizardComplete}
          onClose={() => setShowWizard(false)}
          editMode={hasCompatibilityProfile}
          initialData={userProfile}
          initialBudget={userBudget}
          showBudgetStep={!hasCompatibilityProfile} // only show budget during initial onboarding step
        />
      )}

      {/* Budget Editor Modal */}
      {showBudgetEditor && (
        <BudgetEditor
          onClose={() => setShowBudgetEditor(false)}
          onSaved={handleBudgetSaved}
          initialBudget={userBudget}
        />
      )}
    </main>
  );
}
