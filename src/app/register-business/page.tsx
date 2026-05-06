"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, MapPin, Phone, Mail, Camera, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"none" | "pending" | "approved" | "rejected" | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    company_name: "",
    location: "",
    country_code: "+91",
    phone_number: "",
    alternate_email: "",
    profile_pic_url: "",
  });

  useEffect(() => {
    // Check if user already has an application
    fetch("/api/business/register")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data.status) {
          setApplicationStatus(data.status);
        } else {
          setApplicationStatus("none");
        }
      })
      .catch((err) => {
        console.error(err);
        setApplicationStatus("none");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm((f) => ({ ...f, profile_pic_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = form.company_name.trim() && form.location.trim() && form.phone_number.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone_number: `${form.country_code} ${form.phone_number}`
        }),
      });

      if (res.ok) {
        setApplicationStatus("pending");
      } else {
        const data = await res.json();
        alert(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (applicationStatus === "pending") {
    return (
      <div className="min-h-screen pt-28 pb-20 px-6 bg-slate-50 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Waiting for Approval</h1>
          <p className="text-slate-600 mb-8">
            Your business registration application is currently under review by our administrators. We will notify you once a decision has been made.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (applicationStatus === "rejected") {
    return (
      <div className="min-h-screen pt-28 pb-20 px-6 bg-slate-50 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100">
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Application Rejected</h1>
          <p className="text-slate-600 mb-8">
            Unfortunately, your business registration application was not approved. You cannot re-apply at this time.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (applicationStatus === "approved") {
    return (
      <div className="min-h-screen pt-28 pb-20 px-6 bg-slate-50 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">You are Approved!</h1>
          <p className="text-slate-600 mb-8">
            Your account is already registered as a business. You can manage your trips from the Business Dashboard.
          </p>
          <button
            onClick={() => router.push("/dashboard/business")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
          >
            Go to Business Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 bg-slate-50 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Register Your Business</h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Become an official trip organizer on GoTogether. Share your curated trips with our community of passionate travelers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center text-orange-400">
                {form.profile_pic_url ? (
                  <img src={form.profile_pic_url} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <Briefcase className="w-12 h-12 opacity-50" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
                title="Upload company logo"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-sm font-medium text-slate-500">Upload Company Logo</p>
          </div>

          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                Company / Organization Name *
              </label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. Wanderlust Adventures"
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all font-medium"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                Base Location *
              </label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. New York, USA"
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all font-medium"
              />
            </div>

            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500" />
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.country_code}
                    onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                    className="w-28 px-3 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all font-medium bg-slate-50"
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
                    required
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-500" />
                  Alternate Email (Optional)
                </label>
                <input
                  type="email"
                  value={form.alternate_email}
                  onChange={(e) => setForm({ ...form, alternate_email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
            <p className="text-center text-sm text-slate-500 mt-4">
              By submitting, you agree to our Terms of Service for organizers.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
