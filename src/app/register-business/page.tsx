"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Building2, Camera, Loader2,
  CheckCircle, XCircle, Receipt, CreditCard,
  Check, UserCircle, ChevronRight, ShieldAlert, Copy, ChevronLeft
} from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"none" | "pending" | "approved" | "rejected" | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const [logoLoading, setLogoLoading] = useState(false);
  const [panPhotoLoading, setPanPhotoLoading] = useState(false);
  const [panPhotoError, setPanPhotoError] = useState("");

  const [step, setStep] = useState(1);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    location: "",
    country_code: "+91",
    phone_number: "",
    alternate_email: "",
    profile_pic_url: "",
    pan_number: "",
    pan_photo_url: "",
    payment_provider: "RAZORPAY",
    razorpay_account_id: "",
    razorpay_account_holder_name: "",
    razorpay_account_email: "",
    razorpay_account_phone: "",
    api_key: "",
    api_secret: "",
    webhook_secret: "",
    payment_terms_accepted: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()).catch(() => ({ profile: null })),
      fetch("/api/business/register").then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }).catch(() => ({ status: null }))
    ]).then(([profileData, appData]) => {
      const p = profileData.profile;
      if (p) {
        const missing: string[] = [];
        if (!p.full_name?.trim()) missing.push("Full Name");
        if (!p.phone_number?.trim()) missing.push("Phone Number");
        if (!p.age) missing.push("Age");
        if (!p.gender) missing.push("Gender");
        if (!p.profession) missing.push("Profession");
        if (!p.fooding_habit) missing.push("Food Habit");
        setMissingFields(missing);
        setProfileComplete(missing.length === 0);
      } else {
        setProfileComplete(false);
        setMissingFields(["Full Name", "Phone Number", "Age", "Gender", "Profession", "Food Habit"]);
      }

      if (appData.status) {
        setApplicationStatus(appData.status);
      } else {
        setApplicationStatus("none");
      }
    }).finally(() => setLoading(false));
  }, []);

  const uploadToCloud = async (fileOrData: File | string): Promise<string> => {
    return uploadToCloudinary(fileOrData, "gotogether/businesses");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const url = await uploadToCloud(file);
      setForm((f) => ({ ...f, profile_pic_url: url }));
    } catch (err) {
      console.error("Logo upload failed:", err);
      alert("Failed to upload company logo.");
    } finally {
      setLogoLoading(false);
    }
  };

  const handlePanPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPanPhotoError("");
    const maxSizeBytes = 5 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setPanPhotoError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`);
      setForm((f) => ({ ...f, pan_photo_url: "" }));
      return;
    }

    setPanPhotoLoading(true);
    try {
      const url = await uploadToCloudinary(file, "gotogether/business");
      setForm((f) => ({ ...f, pan_photo_url: url }));
    } catch (err) {
      console.error("PAN photo upload failed:", err);
      setPanPhotoError("Failed to upload PAN photo. Please try again.");
    } finally {
      setPanPhotoLoading(false);
    }
  };

  const handleCopyWebhook = () => {
    const url = `https://gotogethertrip.com/api/webhooks/payments/${form.payment_provider.toLowerCase()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCredentialVerification = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch("/api/organizer/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.payment_provider,
          key_id: form.api_key,
          key_secret: form.api_secret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationResult({
          success: data.success,
          message: data.message,
          error: data.error,
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.error || "Verification failed.",
        });
      }
    } catch {
      setVerificationResult({
        success: false,
        message: "Failed to connect to verification server.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationResult?.success) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.company_name,
          location: form.location,
          phoneNumber: form.country_code + form.phone_number,
          alternateEmail: form.alternate_email,
          profilePicUrl: form.profile_pic_url,
          panNumber: form.pan_number,
          panPhotoUrl: form.pan_photo_url,
          paymentProvider: form.payment_provider,
          providerAccountId: form.razorpay_account_id || (form.payment_provider === "CASHFREE" ? form.api_key : ""),
          providerAccountHolderName: form.razorpay_account_holder_name,
          provider_registered_email: form.razorpay_account_email,
          provider_registered_phone: form.razorpay_account_phone,
          paymentTermsAccepted: form.payment_terms_accepted,
          api_key: form.api_key,
          api_secret: form.api_secret,
          webhook_secret: requiresWebhookSecret ? form.webhook_secret : undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setApplicationStatus("pending");
      } else {
        alert(data.error || "Failed to register organization.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during submission.");
    } finally {
      setSubmitting(true); // Keep submitting state until redirect / refresh happens
      window.location.reload();
    }
  };

  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number);
  const isProviderAccountValid = form.razorpay_account_id.trim().length > 4;
  const providerCredentialCopy = {
    RAZORPAY: {
      dashboardName: "Razorpay",
      apiKeyLabel: "Key ID",
      apiSecretLabel: "Key Secret",
      apiKeyPlaceholder: "e.g. rzp_live_xyz",
      apiSecretPlaceholder: "Razorpay key secret",
      accountLabel: "Razorpay Account ID",
      accountPlaceholder: "e.g. acc_ABC123",
      requiresWebhookSecret: true,
      webhookInstruction: "Set a Webhook Secret key in Razorpay and keep it ready for Step 5.",
      webhookSaveInstruction: "Save webhook. Copy the webhook secret for Step 5.",
      verificationText: "Complete verification details and input the exact webhook secret key configured on your dashboard.",
      webhookSecretLabel: "Webhook Secret Key",
      webhookSecretPlaceholder: "Secret configured in Razorpay webhook",
      eventsText: "payment.captured, refund.processed, refund.failed",
    },
    CASHFREE: {
      dashboardName: "Cashfree",
      apiKeyLabel: "Client ID / App ID",
      apiSecretLabel: "Client Secret",
      apiKeyPlaceholder: "e.g. TESTxxxxxxxxxxxx",
      apiSecretPlaceholder: "Cashfree client secret",
      accountLabel: "Cashfree Client ID / App ID",
      accountPlaceholder: "No separate merchant ID needed; use your Client ID / App ID",
      requiresWebhookSecret: false,
      webhookInstruction: "Cashfree uses your Client Secret from Step 3 to verify webhook signatures. No separate webhook secret is created.",
      webhookSaveInstruction: "Save webhook and continue to Step 5 with your account verification details.",
      verificationText: "Complete account verification details. Cashfree webhook signatures are verified with the Client Secret entered in Step 3.",
      webhookSecretLabel: "Webhook Secret Key",
      webhookSecretPlaceholder: "Not required for Cashfree",
      eventsText: "payment success and refund status events",
    },
  } as const;
  const providerCopy = providerCredentialCopy[form.payment_provider as keyof typeof providerCredentialCopy] || providerCredentialCopy.RAZORPAY;
  const requiresWebhookSecret = providerCopy.requiresWebhookSecret;

  const nextStep = () => {
    if (step === 5) {
      // Trigger verification automatically when moving to Step 6
      setStep(6);
      runCredentialVerification();
    } else {
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Step validation checkers
  const isStep1Valid = form.company_name.trim().length > 1 &&
                       form.location.trim().length > 1 &&
                       form.phone_number.trim().length > 5 &&
                       isPanValid &&
                       form.pan_photo_url.trim().length > 0;

  const isStep2Valid = true; // Select provider is always valid
  const isStep3Valid = form.api_key.trim().length > 4 && form.api_secret.trim().length > 4;
  const isStep4Valid = true; // Display webhook info
  const isStep5Valid = (!requiresWebhookSecret || form.webhook_secret.trim().length > 4) &&
                       isProviderAccountValid &&
                       form.razorpay_account_holder_name.trim().length > 2 &&
                       form.razorpay_account_email.trim().length > 4 &&
                       form.razorpay_account_phone.trim().length > 5 &&
                       form.payment_terms_accepted;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Profile incomplete alert page
  if (profileComplete === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
            <UserCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Complete Your Profile</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Before registering your organization, please complete your personal profile. This helps us verify your identity.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-left mb-6 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Missing Fields:</div>
            <ul className="space-y-1.5">
              {missingFields.map((field) => (
                <li key={field} className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            Go to Profile <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Application pending state page
  if (applicationStatus === "pending") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-orange-400" />
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border border-amber-100">
            <Loader2 className="w-9 h-9 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Onboarding Review Pending</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your registration is currently under validation by our team. We are checking your credentials, pan identity details, and gateway configs.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 border border-slate-100 leading-normal">
            Verification typically completes within 24 hours. We will notify you by email as soon as your account is approved.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 flex justify-center items-center">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Register Your Business</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Set up your Organizer-Owned direct payment gateway account step-by-step.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex justify-between items-center text-xs">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === s ? "bg-orange-500 text-white" :
                step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`font-semibold hidden sm:inline ${step === s ? "text-slate-800" : "text-slate-400"}`}>
                {s === 1 ? "Business" :
                 s === 2 ? "Provider" :
                 s === 3 ? "API" :
                 s === 4 ? "Webhook" :
                 s === 5 ? "Secret" : "Verify"}
              </span>
              {s < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />}
            </div>
          ))}
        </div>

        {/* Wizard Form Container */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 relative overflow-hidden">

          {/* STEP 1: Business Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                Step 1: Business Information
              </h2>

              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-2xl border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                    {logoLoading ? (
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    ) : form.profile_pic_url ? (
                      <img src={form.profile_pic_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Briefcase className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-bold mt-2">Upload Logo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Company Name *</label>
                  <input type="text" placeholder="Wanderlust Inc." value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="premium-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Base Location *</label>
                  <input type="text" placeholder="Mumbai, India" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="premium-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Phone Number *</label>
                  <input type="text" placeholder="Mobile Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, '') })} className="premium-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Alternate Email</label>
                  <input type="email" placeholder="contact@wanderlust.com" value={form.alternate_email} onChange={(e) => setForm({ ...form, alternate_email: e.target.value })} className="premium-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">PAN Card Number *</label>
                  <input type="text" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })} className="premium-input" />
                  {form.pan_number.length > 0 && !isPanValid && (
                    <p className="text-[10px] text-rose-500 font-semibold mt-1">
                      Must be 5 letters, 4 digits, and 1 letter (e.g., ABCDE1234F).
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">PAN Photo (Under 5MB) *</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => panInputRef.current?.click()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">
                      {form.pan_photo_url ? "Change Attachment" : "Upload File"}
                    </button>
                    {panPhotoLoading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                    {form.pan_photo_url && !panPhotoLoading && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <input ref={panInputRef} type="file" accept="image/*" className="hidden" onChange={handlePanPhotoChange} />
                  {panPhotoError && (
                    <p className="text-[10px] text-rose-500 font-semibold mt-1">{panPhotoError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Payment Provider */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                Step 2: Choose Payment Provider
              </h2>
              <p className="text-sm text-slate-500">Select the Direct Organizer-Owned provider account for payment collection:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "RAZORPAY", label: "Razorpay", hint: "Direct gateway settlement" },
                  { id: "CASHFREE", label: "Cashfree", hint: "Direct gateway settlement" },
                ].map((prov) => (
                  <label key={prov.id} className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    form.payment_provider === prov.id ? "border-orange-500 bg-orange-50/50" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{prov.label}</span>
                      <input type="radio" checked={form.payment_provider === prov.id} onChange={() => setForm({ ...form, payment_provider: prov.id })} className="text-orange-500" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 font-medium">{prov.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Enter API Credentials */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Step 3: Enter API Credentials
              </h2>
              <p className="text-sm text-slate-500">Enter credentials generated inside your payment dashboard. GoTogether encrypts keys using AES-256-GCM.</p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{providerCopy.apiKeyLabel} *</label>
                  <input type="text" placeholder={providerCopy.apiKeyPlaceholder} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className="premium-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{providerCopy.apiSecretLabel} *</label>
                  <input type="password" placeholder={providerCopy.apiSecretPlaceholder} value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} className="premium-input" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Webhook Configuration */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" />
                Step 4: Webhook Configuration
              </h2>
              <p className="text-sm text-slate-500">Configure Webhooks on your provider account dashboard to notify GoTogether of successful transactions.</p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Webhook Destination URL:</div>
                  <div className="flex gap-2 items-center bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600 break-all select-all flex-1">
                      https://gotogethertrip.com/api/webhooks/payments/{form.payment_provider.toLowerCase()}
                    </span>
                    <button onClick={handleCopyWebhook} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 flex items-center gap-1 transition-colors border border-slate-200 shrink-0">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed font-medium">
                  <div className="font-extrabold text-slate-800 uppercase tracking-wider">Instructions:</div>
                  <div>1. Log in to your <strong>{providerCopy.dashboardName} Dashboard</strong>.</div>
                  <div>2. Create a Webhook endpoint. Paste the copied destination URL.</div>
                  <div>3. {providerCopy.webhookInstruction}</div>
                  <div>4. Enable required events: {providerCopy.eventsText}.</div>
                  <div>5. {providerCopy.webhookSaveInstruction}</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Webhook Secret & Verification Details */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-500" />
                Step 5: {requiresWebhookSecret ? "Webhook Secret & Verification" : "Account Verification"}
              </h2>
              <p className="text-sm text-slate-500">{providerCopy.verificationText}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiresWebhookSecret && (
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{providerCopy.webhookSecretLabel} *</label>
                    <input type="password" placeholder={providerCopy.webhookSecretPlaceholder} value={form.webhook_secret} onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })} className="premium-input" />
                  </div>
                )}
                <div className={requiresWebhookSecret ? "space-y-1" : "space-y-1 md:col-span-2"}>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{providerCopy.accountLabel} *</label>
                  <input type="text" placeholder={providerCopy.accountPlaceholder} value={form.razorpay_account_id} onChange={(e) => setForm({ ...form, razorpay_account_id: e.target.value })} className="premium-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Account Holder Name *</label>
                  <input type="text" placeholder="As shown on gateway profile" value={form.razorpay_account_holder_name} onChange={(e) => setForm({ ...form, razorpay_account_holder_name: e.target.value })} className="premium-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Registered Email *</label>
                  <input type="email" placeholder="owner@company.com" value={form.razorpay_account_email} onChange={(e) => setForm({ ...form, razorpay_account_email: e.target.value })} className="premium-input" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Registered Phone Number *</label>
                  <input type="tel" placeholder="Gateway registered mobile" value={form.razorpay_account_phone} onChange={(e) => setForm({ ...form, razorpay_account_phone: e.target.value })} className="premium-input" />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.payment_terms_accepted} onChange={(e) => setForm({ ...form, payment_terms_accepted: e.target.checked })} className="mt-0.5" />
                  <span>I authorize GoTogether to request payment checkout sessions, verify signatures, and initiate refunds dynamically. GoTogether collects 0% platform commissions in organizer-owned mode.</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: Credential Verification */}
          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-500" />
                Step 6: Credential Verification
              </h2>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center space-y-4">
                {verifying ? (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    <span className="text-sm font-bold text-slate-600">Verifying API Credentials & Gateway Reachability...</span>
                  </div>
                ) : verificationResult?.success ? (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <CheckCircle className="w-12 h-12 text-emerald-500 animate-bounce" />
                    <span className="text-base font-extrabold text-slate-800">Verification Succeeded!</span>
                    <p className="text-xs text-slate-500 max-w-xs">{verificationResult.message}</p>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <XCircle className="w-12 h-12 text-rose-500" />
                    <span className="text-base font-extrabold text-slate-800">Verification Failed</span>
                    <p className="text-xs text-rose-500 max-w-sm font-semibold">{verificationResult?.message || "Invalid credentials."}</p>
                    <button onClick={runCredentialVerification} className="mt-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                      Retry Check
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step Actions Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center gap-4">
            {step > 1 ? (
              <button onClick={prevStep} className="px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold flex items-center gap-1.5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                onClick={nextStep}
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && !isStep2Valid) ||
                  (step === 3 && !isStep3Valid) ||
                  (step === 4 && !isStep4Valid) ||
                  (step === 5 && !isStep5Valid)
                }
                className={`px-6 py-3 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 transition-all duration-300 ${
                  ((step === 1 && !isStep1Valid) ||
                   (step === 2 && !isStep2Valid) ||
                   (step === 3 && !isStep3Valid) ||
                   (step === 4 && !isStep4Valid) ||
                   (step === 5 && !isStep5Valid))
                    ? "bg-slate-400 opacity-60 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-orange-500/20 cursor-pointer"
                }`}
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !verificationResult?.success}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Activation"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

