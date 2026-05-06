"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  User, Edit3, Save, X, Camera, MapPin,
  Briefcase, GraduationCap, CheckCircle, Loader2, ChevronRight,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profession: string | null;
  fooding_habit: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  phone_verified: number;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
  created_at: string;
}

const PROFESSION_OPTIONS = [
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "working", label: "Working Professional", icon: Briefcase },
  { value: "freelancer", label: "Freelancer", icon: User },
  { value: "other", label: "Other", icon: User },
];

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function isProfileComplete(p: Profile): boolean {
  return !!(p.full_name?.trim() && p.phone_number?.trim() && p.age && p.gender && p.profession && p.fooding_habit);
}

export default function DashboardClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // OTP State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    age: "",
    gender: "",
    bio: "",
    profession: "",
    fooding_habit: "",
    avatar_url: "",
    country_code: "+91",
    phone_number: "",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile: p }) => {
        if (p) {
          setProfile(p);
          
          let cCode = "+91";
          let pNum = p.phone_number || "";
          if (pNum.includes(" ")) {
            const parts = pNum.split(" ");
            cCode = parts[0];
            pNum = parts.slice(1).join(" ");
          }

          setForm({
            full_name: p.full_name || "",
            age: p.age?.toString() || "",
            gender: p.gender || "",
            bio: p.bio || "",
            profession: p.profession || "",
            fooding_habit: p.fooding_habit || "",
            avatar_url: p.avatar_url || "",
            country_code: cCode,
            phone_number: pNum,
          });
          // If incomplete → open edit mode right away (setup wizard)
          if (!isProfileComplete(p)) setEditing(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm((f) => ({ ...f, avatar_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = !!(form.full_name?.trim() && form.phone_number?.trim() && form.age && form.gender && form.profession && form.fooding_habit);

  const handleSave = async () => {
    if (!isFormValid) {
      alert("Please fill out all required fields: Full Name, Phone, Age, Gender, Profession, and Food Habit.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          age: form.age ? parseInt(form.age) : null,
          gender: form.gender || null,
          bio: form.bio || null,
          profession: form.profession || null,
          fooding_habit: form.fooding_habit || null,
          avatar_url: form.avatar_url || null,
          phone_number: form.phone_number ? `${form.country_code} ${form.phone_number}` : null,
        }),
      });
      const { profile: updated } = await res.json();
      if (updated) {
        setProfile(updated);
        setEditing(false);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile && !isProfileComplete(profile)) {
      // Cannot cancel if setting up
      return;
    }
    if (profile) {
      let cCode = "+91";
      let pNum = profile.phone_number || "";
      if (pNum.includes(" ")) {
        const parts = pNum.split(" ");
        cCode = parts[0];
        pNum = parts.slice(1).join(" ");
      }
      setForm({
        full_name: profile.full_name || "",
        age: profile.age?.toString() || "",
        gender: profile.gender || "",
        bio: profile.bio || "",
        profession: profile.profession || "",
        fooding_habit: profile.fooding_habit || "",
        avatar_url: profile.avatar_url || "",
        country_code: cCode,
        phone_number: pNum,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  const initial =
    (form.full_name || profile?.email || "U").charAt(0).toUpperCase();
  const isSetup = profile && !isProfileComplete(profile);

  return (
    <div className="space-y-8">
      {/* ─── Setup Banner ─── */}
      {isSetup && (
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl p-5 text-white flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">Complete your profile 👋</p>
            <p className="text-white/80 text-sm">
              Fill in a few details so other travelers can connect with you.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-60" />
        </div>
      )}

      {/* ─── Saved toast ─── */}
      {savedMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-5 h-5" /> Profile saved successfully!
        </div>
      )}

      {/* ─── Trip Management ─── */}
      {!isSetup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/organizer" className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Organizer Dashboard</h3>
              <p className="text-sm text-slate-500">Manage trips you've created</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto text-slate-300 group-hover:text-orange-400 transition-colors" />
          </Link>
          
          <Link href="/dashboard/user" className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">My Applications</h3>
              <p className="text-sm text-slate-500">Track trips you want to join</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto text-slate-300 group-hover:text-emerald-400 transition-colors" />
          </Link>
        </div>
      )}

      {/* ─── Profile Card ─── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-r from-orange-400 via-rose-400 to-pink-400" />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-3xl font-bold">
                {(editing ? form.avatar_url : profile?.avatar_url) ? (
                  <img
                    src={editing ? form.avatar_url : profile?.avatar_url!}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={() => {
                      if (editing) {
                        setForm(f => ({ ...f, avatar_url: "" }));
                      } else if (profile) {
                        setProfile(p => p ? { ...p, avatar_url: null } : null);
                      }
                    }}
                  />
                ) : (
                  initial
                )}
              </div>
              {editing && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
                    title="Upload photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </>
              )}
            </div>

            <div className="flex gap-2 mt-14">
              {editing ? (
                <>
                  {!isSetup && (
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !isFormValid}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Saving…" : "Save Profile"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-orange-300 transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── Fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition"
                />
              ) : (
                <p className="text-xl font-bold text-slate-900">
                  {profile?.full_name || <span className="text-slate-400">Not set</span>}
                </p>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <p className="text-slate-700 font-medium">{profile?.email}</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Phone Number *
              </label>
              {editing ? (
                <div className="flex gap-2">
                  <select
                    value={form.country_code}
                    onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))}
                    className="w-24 px-3 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition bg-slate-50"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+971">+971 (AE)</option>
                    <option value="+65">+65 (SG)</option>
                    <option value="+81">+81 (JP)</option>
                  </select>
                  <input
                    type="tel"
                    value={form.phone_number}
                    onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value.replace(/\D/g, '') }))}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-semibold">
                    {profile?.phone_number ?? <span className="text-slate-400">Not set</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Age *
              </label>
              {editing ? (
                <input
                  type="number"
                  min={13}
                  max={100}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition"
                />
              ) : (
                <p className="text-slate-900 font-semibold">
                  {profile?.age ?? <span className="text-slate-400">Not set</span>}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Gender *
              </label>
              {editing ? (
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition bg-white"
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-slate-900 font-semibold">
                  {profile?.gender ?? <span className="text-slate-400">Not set</span>}
                </p>
              )}
            </div>

            {/* Profession */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Profession *
              </label>
              {editing ? (
                <div className="grid grid-cols-2 gap-2">
                  {PROFESSION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = form.profession === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, profession: opt.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          selected
                            ? "border-orange-400 bg-orange-50 text-orange-700"
                            : "border-slate-200 text-slate-600 hover:border-orange-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-900 font-semibold capitalize">
                  {PROFESSION_OPTIONS.find((o) => o.value === profile?.profession)?.label ?? (
                    <span className="text-slate-400">Not set</span>
                  )}
                </p>
              )}
            </div>

            {/* Food Habit */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Food Habit *
              </label>
              {editing ? (
                <div className="grid grid-cols-3 gap-2">
                  {["Veg", "Non-Veg", "Any"].map((opt) => {
                    const selected = form.fooding_habit === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, fooding_habit: opt }))}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          selected
                            ? "border-orange-400 bg-orange-50 text-orange-700"
                            : "border-slate-200 text-slate-600 hover:border-orange-200"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-900 font-semibold">
                  {profile?.fooding_habit ?? <span className="text-slate-400">Not set</span>}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                About Me
              </label>
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="A short bio — travel style, interests, anything you want fellow travelers to know…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition resize-none"
                />
              ) : (
                <p className="text-slate-700 leading-relaxed">
                  {profile?.bio || <span className="text-slate-400">No bio yet — add one!</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
