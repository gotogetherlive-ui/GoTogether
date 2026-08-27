"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Search, Calendar, Briefcase, Camera, Loader2, Heart, CheckCircle, Utensils, UserRound, Users, Sparkles, Wallet, Globe, Compass, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import Image from "next/image";
import type { BreakdownItem, BudgetProfile, CompatibilityProfile } from "@/lib/matchEngine";

type CompatibilityFormProfile = Omit<CompatibilityProfile, "activity_preferences" | "languages"> & {
  activity_preferences: string[];
  languages: string[];
};

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const CompatibilityWizard = dynamic(() => import("@/components/CompatibilityWizard"), {
  loading: () => <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>,
});
const BudgetEditor = dynamic(() => import("@/components/BudgetEditor"), {
  loading: () => <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>,
});

interface Trip {
  id: string;
  title: string;
  description: string;
  destination: string;
  starting_location: string;
  trip_date: string;
  duration_days: number;
  duration_nights: number;
  traveller_type: "solo" | "couple";
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
  match_breakdown?: BreakdownItem[];
  common_activities?: string[];
  common_languages?: string[];
  organizer_travel_style?: string | null;
  organizer_food_pref?: string | null;
  organizer_languages?: string[] | null;
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
  const [filterTravellerType, setFilterTravellerType] = useState("");

  // Create Form State
  const [form, setForm] = useState({
    destination: "",
    starting_location: "",
    trip_date: "",
    duration_days: "",
    duration_nights: "",
    traveller_type: "",
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
    traveller_type: "",
    image_url: "",
  });
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMatchTrip, setSelectedMatchTrip] = useState<Trip | null>(null);
  const [userProfile, setUserProfile] = useState<CompatibilityFormProfile | null>(null);
  const [userBudget, setUserBudget] = useState<BudgetProfile | null>(null);
  const [hasCompatibilityProfile, setHasCompatibilityProfile] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(isAuthenticated);

  const fetchCompatibilityStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/compatibility");
      if (res.ok) {
        const data = await res.json();
        setHasCompatibilityProfile(data.hasProfile);
        setUserProfile(data.profile ? {
          ...data.profile,
          activity_preferences: parseStringList(data.profile.activity_preferences),
          languages: parseStringList(data.profile.languages),
        } : null);
        setUserBudget(data.budget || null);
      }
    } catch (err) {
      console.error("Failed to fetch compatibility status", err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);
  const fetchTrips = useCallback(async () => {
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
  }, []);
  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchTrips();
      if (isAuthenticated) void fetchCompatibilityStatus();
      else setLoadingProfile(false);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchTrips, fetchCompatibilityStatus, isAuthenticated]);

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
      traveller_type: trip.traveller_type || "solo",
      image_url: trip.image_url || "",
    });
  };

  const handleEditImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryClient");
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
      const { uploadToCloudinary } = await import("@/lib/cloudinaryClient");
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
        setForm({ destination: "", starting_location: "", trip_date: "", duration_days: "", duration_nights: "", traveller_type: "", image_url: "" });
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
        setTrips((currentTrips) => currentTrips.map((trip) => trip.id === tripId ? { ...trip, user_request_status: 'pending' } : trip));
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("An error occurred while showing interest.");
    }
  };

  const filteredTrips = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const today = new Date().setHours(0, 0, 0, 0);
    return trips.filter((trip) => {
      const matchesSearch = !normalizedSearch || trip.destination.toLowerCase().includes(normalizedSearch) ||
        (trip.starting_location || "").toLowerCase().includes(normalizedSearch);
      const matchesDate = !filterDate || trip.trip_date === filterDate;
      const matchesDuration = !filterDuration ||
        (filterDuration === "1-3" && trip.duration_days <= 3) ||
        (filterDuration === "4-7" && trip.duration_days >= 4 && trip.duration_days <= 7) ||
        (filterDuration === "8+" && trip.duration_days >= 8);
      const matchesGender = !filterGender || trip.organizer_gender === filterGender;
      const matchesTravellerType = !filterTravellerType || trip.traveller_type === filterTravellerType;
      const isPast = Boolean(trip.trip_date && new Date(trip.trip_date).getTime() < today);
      return (!isPast || trip.organizer_id === currentUserId) && matchesSearch && matchesDate && matchesDuration && matchesGender && matchesTravellerType;
    });
  }, [trips, searchQuery, filterDate, filterDuration, filterGender, filterTravellerType, currentUserId]);
  const hasActiveFilters = Boolean(searchQuery || filterDate || filterDuration || filterGender || filterTravellerType);
  const clearFilters = () => {
    setSearchQuery("");
    setFilterDate("");
    setFilterDuration("");
    setFilterGender("");
    setFilterTravellerType("");
  };

  // â”€â”€â”€ Loading Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loadingProfile || (loading && trips.length === 0)) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-orange-600" />
        <p className="text-sm font-medium text-slate-600">Loading travel plans...</p>
      </main>
    );
  }

  // â”€â”€â”€ Mandatory Onboarding Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAuthenticated && !hasCompletedProfile) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Complete your profile</h2>
          <p className="mt-3 text-slate-600">Complete your dashboard profile before creating plans, showing interest, or setting travel preferences.</p>
          <button onClick={() => router.push("/dashboard")} className="mt-6 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">Complete profile</button>
        </div>
      </main>
    );
  }

  if (isAuthenticated && !hasCompatibilityProfile) {
    return (
      <main className="flex-1 pt-28 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center min-h-[70vh]">
        <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
          <div className="space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Sparkles className="h-6 w-6" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Set up your travel preferences
            </h2>

            <p className="mx-auto max-w-md text-sm leading-6 text-slate-600 md:text-base">
              Answer a short set of questions so we can rank travel plans by compatibility, budget, and travel style.
            </p>

            <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-slate-50 p-5 text-left">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What this enables</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Compatibility based on 11 travel preferences
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Budget range matching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  A clear breakdown for each organizer
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowWizard(true)}
              className="w-full max-w-md rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Set up travel preferences
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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-24 md:px-8 md:pt-28">
      {/* Hero Header */}
      <header className="mb-8 border-b border-slate-200 pb-6 md:flex md:items-end md:justify-between md:gap-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-600">GoTogether community</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Find a travel buddy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Browse verified travel plans by destination, date, traveller type, and compatibility.
          </p>
        </div>
          <div className="mt-5 shrink-0 md:mt-0">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("search")}
                className={`rounded-md px-5 py-2.5 text-sm font-semibold transition ${activeTab === "search"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <Search className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Search Trips
              </button>
              <button
                onClick={openCreatePlan}
                className={`rounded-md px-5 py-2.5 text-sm font-semibold transition ${activeTab === "create"
                    ? "bg-orange-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <Camera className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Create Plan
              </button>
            </div>
          </div>
      </header>

      {!isAuthenticated && (
        <div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-center md:flex-row md:text-left">
          <div>
            <p className="font-extrabold text-slate-900">Preview Find Buddy trips</p>
            <p className="text-sm text-slate-600">Sign in and complete your travel preferences to create a plan, see match scores, or show interest.</p>
          </div>
          <button onClick={() => router.push("/login?next=/buddy")} className="shrink-0 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">Sign in to continue</button>
        </div>
      )}

      {/* Compatibility DNA Status Bar */}
      {hasCompatibilityProfile && activeTab === "search" && (
        <div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Your compatibility profile is active</p>
              <p className="text-xs text-slate-500">Trip feed is sorted to show your highest compatibility matches first.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Edit preferences
            </button>
            <button
              onClick={() => setShowBudgetEditor(true)}
              className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-500" /> Edit budget (INR)
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
          className={`mb-8 rounded-lg border p-4 ${message.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label="Find buddy filters">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Search available trips</h2>
                  <p className="text-xs text-slate-500">Use the filters to narrow the results</p>
                </div>
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.7fr)_repeat(4,minmax(130px,1fr))]">
              <label className="relative block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Route or destination</span>
                <input type="text" placeholder="Try Goa, Manali or Delhi" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="premium-input-icon peer" />
                <Search className="absolute left-4 bottom-[15px] h-4 w-4 text-orange-500 pointer-events-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Departure date</span>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="premium-select w-full" title="Filter by trip date" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Duration</span>
                <select value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)} className="premium-select w-full">
                  <option value="">Any duration</option><option value="1-3">1-3 Days</option><option value="4-7">4-7 Days</option><option value="8+">8+ Days</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Buddy gender</span>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="premium-select w-full">
                  <option value="">Any gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Travel party</span>
                <select value={filterTravellerType} onChange={(e) => setFilterTravellerType(e.target.value)} className="premium-select w-full" aria-label="Filter by traveller type">
                  <option value="">Any type</option><option value="solo">Solo Traveller</option><option value="couple">Couple Travelling</option>
                </select>
              </label>
            </div>
          </section>

          {!loading && trips.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-bold text-slate-800"><span className="text-orange-600">{filteredTrips.length}</span> {filteredTrips.length === 1 ? "travel plan" : "travel plans"} found</p>
              <p className="hidden text-xs font-medium text-slate-400 sm:block">Sorted by compatibility</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-orange-600" />
              <p className="text-sm font-medium text-slate-600">Loading travel plans...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <div>
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                  <MapPin className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">{trips.length === 0 ? "No travel plans yet" : "No exact matches"}</h3>
                <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">{trips.length === 0 ? "Be the first to create a trip plan and find your travel companion." : "Try clearing a filter or changing your destination to discover more buddies."}</p>
                <button
                  onClick={trips.length === 0 ? openCreatePlan : clearFilters}
                  className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  {trips.length === 0 ? "Create a Plan" : "Clear Filters"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips
                .map((trip) => {
                  const isPast = trip.trip_date ? new Date(trip.trip_date) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
                  const isClosed = trip.registration_closed === 1;
                  return (
                    <article key={trip.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative h-48 overflow-hidden bg-slate-200">
                        {trip.image_url ? (
                          <Image src={trip.image_url} alt={`${trip.title} trip image in ${trip.destination}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-200">
                            <MapPin className="h-12 w-12 text-slate-400" />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
                            <MapPin className="h-3 w-3 text-orange-600" /> {trip.destination}
                          </span>
                          {trip.starting_location && (
                            <span className="flex items-center gap-1.5 rounded-md bg-slate-900/85 px-2.5 py-1.5 text-[11px] font-medium text-white">
                              From {trip.starting_location}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
                            <Calendar className="w-3 h-3 text-orange-500" />
                            {trip.duration_days}D / {trip.duration_nights}N
                          </span>
                          <span className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ${trip.traveller_type === "couple"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-sky-200 bg-sky-50 text-sky-700"
                            }`}>
                            {trip.traveller_type === "couple" ? <Heart className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}
                            {trip.traveller_type === "couple" ? "Couple Travelling" : "Solo Traveller"}
                          </span>
                          {currentUserId && trip.organizer_id !== currentUserId && hasCompatibilityProfile && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedMatchTrip(trip); }}
                              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-white/40 bg-slate-900/85 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-900"
                              title="View match details"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {trip.match_score}% match
                            </button>
                          )}
                        </div>
                        {/* Bottom info overlay */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="mb-1 line-clamp-1 text-lg font-semibold text-white">{trip.title}</h3>
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
                        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 font-semibold text-white">
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
                              <p className="text-sm font-semibold text-slate-900">{trip.organizer_name}</p>
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
                                <span className="truncate">{trip.organizer_languages.slice(0, 2).join(', ') || 'Not specified'}</span>
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
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              >
                                <CheckCircle className="w-4 h-4" /> Go to Chat
                              </button>
                            )}
                            <button
                              onClick={() => handleEditClick(trip)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-700"
                          >
                            <Heart className="w-4 h-4" /> Show Interest
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-white px-6 py-6 md:px-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Create a trip plan</h2>
              <p className="mt-1 text-sm text-slate-600">Add the practical details travellers need before requesting to join.</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6 bg-slate-50 p-6 md:p-8">
            {/* Step 1: Route Details */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Route Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
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
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Timing & Duration */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">
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

            {/* Step 3: Traveller Type */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                Who is travelling? *
              </h3>
              <p className="mb-4 text-sm text-slate-500">This adds a tag to your plan so buddies can identify your travel group.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`cursor-pointer rounded-lg border p-4 transition ${form.traveller_type === "solo"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-400"
                  }`}>
                  <input
                    type="radio"
                    name="traveller_type"
                    value="solo"
                    required
                    checked={form.traveller_type === "solo"}
                    onChange={() => setForm({ ...form, traveller_type: "solo" })}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><UserRound className="h-5 w-5" /></span>
                    <span>
                      <span className="block font-bold text-slate-900">Solo Traveller</span>
                      <span className="block text-xs text-slate-500">I am travelling on my own</span>
                    </span>
                  </span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-4 transition ${form.traveller_type === "couple"
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-400"
                  }`}>
                  <input
                    type="radio"
                    name="traveller_type"
                    value="couple"
                    required
                    checked={form.traveller_type === "couple"}
                    onChange={() => setForm({ ...form, traveller_type: "couple" })}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Heart className="h-5 w-5" /></span>
                    <span>
                      <span className="block font-bold text-slate-900">Couple Travelling</span>
                      <span className="block text-xs text-slate-500">We are travelling as a couple</span>
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Step 4: Media Upload */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Cover Image (Optional)
              </h3>
              
              <div
                className={`relative flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed transition ${form.image_url ? 'border-orange-500 bg-orange-50/30' : 'border-slate-300 bg-slate-50 hover:border-orange-500'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {form.image_url ? (
                  <>
                    <Image src={form.image_url} alt="New buddy trip cover image preview" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center transition-opacity hover:opacity-100 opacity-90">
                      <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl font-bold text-slate-900 shadow-md flex items-center gap-2 text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce" /> Image Selected (Click to change)
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
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
                disabled={submitting || !form.destination || !form.starting_location || !form.trip_date || !form.duration_days || !form.traveller_type}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving your plan...
                  </>
                ) : (
                  "Publish trip plan"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-950">Edit trip plan</h2>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
                <div className="relative space-y-5 rounded-lg border border-slate-200 bg-white p-5">
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

                <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
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

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Who is travelling?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${editForm.traveller_type === "solo" ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 text-slate-600"}`}>
                      <input
                        type="radio"
                        name="edit_traveller_type"
                        value="solo"
                        checked={editForm.traveller_type === "solo"}
                        onChange={() => setEditForm({ ...editForm, traveller_type: "solo" })}
                        className="sr-only"
                      />
                      <UserRound className="mx-auto mb-1 h-5 w-5" />
                      <span className="text-xs font-bold">Solo Traveller</span>
                    </label>
                    <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${editForm.traveller_type === "couple" ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 text-slate-600"}`}>
                      <input
                        type="radio"
                        name="edit_traveller_type"
                        value="couple"
                        checked={editForm.traveller_type === "couple"}
                        onChange={() => setEditForm({ ...editForm, traveller_type: "couple" })}
                        className="sr-only"
                      />
                      <Heart className="mx-auto mb-1 h-5 w-5" />
                      <span className="text-xs font-bold">Couple Travelling</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Cover Image (Optional)</label>
                  <div
                    className={`relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed transition ${editForm.image_url ? 'border-orange-500 bg-orange-50/30' : 'border-slate-300 bg-slate-50 hover:border-orange-500'
                      }`}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {editForm.image_url ? (
                      <>
                        <Image src={editForm.image_url} alt="Edited buddy trip cover image preview" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
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
                    className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (!editForm.destination.trim() && !editForm.starting_location.trim() && !editForm.trip_date.trim() && !editForm.duration_days.trim() && !editForm.duration_nights.trim() && !editForm.traveller_type.trim() && !editForm.image_url.trim())}
                    className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-7 shadow-xl">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedMatchTrip(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center font-bold text-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 shrink-0">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold leading-tight text-slate-900">Compatibility details</h3>
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
                  <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-slate-600">
                  {selectedMatchTrip.match_score >= 80 ? (
                    `You and ${selectedMatchTrip.organizer_name} have closely aligned travel preferences.`
                  ) : selectedMatchTrip.match_score >= 50 ? (
                    `You share several travel preferences with ${selectedMatchTrip.organizer_name}. Review the details before requesting to join.`
                  ) : (
                    `Your travel preferences differ in several areas. Review the details before deciding.`
                  )}
                </p>
              </div>

              {/* Match Breakdown list */}
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h4 className="border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Match breakdown</h4>
                {selectedMatchTrip.match_breakdown && selectedMatchTrip.match_breakdown.length > 0 ? (
                  selectedMatchTrip.match_breakdown.map((item) => (
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
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
                  {selectedMatchTrip.common_activities && selectedMatchTrip.common_activities.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Shared interests</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMatchTrip.common_activities.map((act: string) => (
                          <span key={act} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedMatchTrip.common_languages && selectedMatchTrip.common_languages.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Shared languages</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMatchTrip.common_languages.map((lang: string) => (
                          <span key={lang} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                className="w-full cursor-pointer rounded-lg bg-orange-600 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-700"
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
