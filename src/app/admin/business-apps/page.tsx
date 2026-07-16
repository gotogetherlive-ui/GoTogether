"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, Building2, User, Phone, MapPin, Mail, FileSignature, Download } from "lucide-react";
import { downloadOrganizerAgreementPdf } from "@/lib/organizerAgreementPdf";

interface Application {
  id: string;
  user_id: string;
  company_name: string;
  location: string;
  phone_number: string;
  alternate_email: string | null;
  profile_pic_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_full_name: string;
  user_email: string;
  pan_number: string | null;
  pan_photo_url: string | null;
  razorpay_account_id: string | null;
  razorpay_account_holder_name: string | null;
  razorpay_account_email: string | null;
  razorpay_account_phone: string | null;
  payment_settlement_model: string | null;
  payment_onboarding_status: string | null;
  agreement_id: string | null;
  agreement_version: string | null;
  signer_name: string | null;
  signed_at: string | null;
  document_hash: string | null;
}

interface SignedAgreement {
  id: string;
  application_id: string;
  agreement_title: string;
  agreement_version: string;
  agreement_text: string;
  document_hash: string;
  signer_name: string;
  signer_email: string;
  company_name: string;
  signed_at: string;
  signer_ip: string | null;
  signer_user_agent: string | null;
}

export default function BusinessAppsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [agreementPreview, setAgreementPreview] = useState<SignedAgreement | null>(null);
  const [agreementLoadingId, setAgreementLoadingId] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/business-apps");
      if (!res.ok) throw new Error("Failed to load applications");
      const data = await res.json();
      setApps(data.applications || []);
    } catch {
      setError("Could not load business applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject" | "block" | "unblock") => {
    if (!confirm(`Are you sure you want to ${action} this application?`)) return;
    
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/business-apps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }

      // Update local state
      setApps(apps.map(app => 
        app.id === id ? { ...app, status: (action === "approve" || action === "unblock") ? "approved" : "rejected" } : app
      ));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openAgreement = async (id: string) => {
    setAgreementLoadingId(id);
    try {
      const res = await fetch(`/api/admin/business-apps/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load signed agreement");
      setAgreementPreview(data.agreement);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load signed agreement");
    } finally {
      setAgreementLoadingId(null);
    }
  };

  const downloadAgreement = async (agreement: SignedAgreement) => {
    try {
      await downloadOrganizerAgreementPdf(agreement);
    } catch {
      alert("Could not create the agreement PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-rose-500 font-medium">{error}</p>
        <button
          onClick={fetchApps}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const pendingApps = apps.filter(a => a.status === "pending");
  const processedApps = apps.filter(a => a.status !== "pending");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" /> Business Applications
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review and manage organizer requests</p>
        </div>
        <button
          onClick={fetchApps}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:text-orange-500 hover:border-orange-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {pendingApps.length === 0 && processedApps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No applications yet</h3>
          <p className="text-slate-500 mt-1">When users apply to become businesses, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pendingApps.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Needs Review ({pendingApps.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {pendingApps.map(app => (
                  <AppCard key={app.id} app={app} onAction={handleAction} processingId={processingId} onPreviewPan={setPreviewUrl} onViewAgreement={openAgreement} agreementLoadingId={agreementLoadingId} />
                ))}
              </div>
            </div>
          )}

          {processedApps.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                Processed ({processedApps.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 opacity-75">
                {processedApps.map(app => (
                  <AppCard key={app.id} app={app} onAction={handleAction} processingId={processingId} onPreviewPan={setPreviewUrl} onViewAgreement={openAgreement} agreementLoadingId={agreementLoadingId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-3xl overflow-hidden p-6 flex flex-col items-center justify-center shadow-2xl border border-slate-100 animate-[scaleUp_0.3s_ease-out]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer z-10 font-bold"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">PAN Document Preview</h3>
            <div className="relative flex-1 w-full overflow-auto max-h-[70vh] flex items-center justify-center border border-slate-100 rounded-2xl bg-slate-50 p-2">
              <img
                src={previewUrl}
                alt="PAN Card Document"
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
            <button
              onClick={() => setPreviewUrl(null)}
              className="mt-4 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {agreementPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  <FileSignature className="h-5 w-5 text-orange-500" /> {agreementPreview.agreement_title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">Immutable signed copy, version {agreementPreview.agreement_version}</p>
              </div>
              <button onClick={() => setAgreementPreview(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200">&times;</button>
            </div>

            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm md:grid-cols-2">
              <p><span className="font-bold text-slate-700">Organizer:</span> {agreementPreview.company_name}</p>
              <p><span className="font-bold text-slate-700">Signer:</span> {agreementPreview.signer_name}</p>
              <p><span className="font-bold text-slate-700">Signer email:</span> {agreementPreview.signer_email}</p>
              <p><span className="font-bold text-slate-700">Signed:</span> {new Date(agreementPreview.signed_at).toLocaleString()}</p>
              <p className="md:col-span-2 break-all font-mono text-xs"><span className="font-sans font-bold text-slate-700">SHA-256:</span> {agreementPreview.document_hash}</p>
            </div>

            <pre className="flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-5 font-sans text-sm leading-6 text-slate-700">{agreementPreview.agreement_text}</pre>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => downloadAgreement(agreementPreview)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
                <Download className="h-4 w-4" /> Download PDF
              </button>
              <button onClick={() => setAgreementPreview(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppCard({ app, onAction, processingId, onPreviewPan, onViewAgreement, agreementLoadingId }: { app: Application, onAction: (id: string, action: "approve" | "reject" | "block" | "unblock") => void, processingId: string | null, onPreviewPan: (url: string) => void, onViewAgreement: (id: string) => void, agreementLoadingId: string | null }) {
  const isProcessing = processingId === app.id;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-start">
      {/* Company Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden shrink-0">
            {app.profile_pic_url ? (
              <img src={app.profile_pic_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-orange-300" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{app.company_name}</h3>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.location}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {app.phone_number}</span>
            </div>
            {app.alternate_email && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {app.alternate_email}</p>
            )}
          </div>
        </div>

        {/* Applicant Info */}
        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applicant</p>
            <p className="text-sm font-medium text-slate-900">{app.user_full_name} <span className="text-slate-500 font-normal">({app.user_email})</span></p>
          </div>
          <div className="ml-auto text-xs text-slate-400">
            Applied on {new Date(app.created_at).toLocaleDateString()}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Review</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><span className="font-semibold">Razorpay:</span> <span className="font-mono text-xs">{app.razorpay_account_id || "Missing"}</span></p>
            <p><span className="font-semibold">Owner:</span> {app.razorpay_account_holder_name || "Missing"}</p>
            <p><span className="font-semibold">Email:</span> {app.razorpay_account_email || "Missing"}</p>
            <p><span className="font-semibold">Phone:</span> {app.razorpay_account_phone || "Missing"}</p>
            <p><span className="font-semibold">PAN:</span> <span className="font-mono text-xs">{app.pan_number || "Missing"}</span></p>
            <p><span className="font-semibold">Settlement:</span> {app.payment_settlement_model || "organizer_direct"}</p>
          </div>
          {app.pan_photo_url && (
            <button
              type="button"
              onClick={() => onPreviewPan(app.pan_photo_url!)}
              className="mt-2 inline-block text-xs font-bold text-orange-600 hover:text-orange-700 bg-transparent border-none p-0 cursor-pointer outline-none align-baseline"
            >
              View PAN document
            </button>
          )}
          <div className="mt-3 border-t border-orange-100 pt-3">
            {app.agreement_id ? (
              <button
                type="button"
                onClick={() => onViewAgreement(app.id)}
                disabled={agreementLoadingId === app.id}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {agreementLoadingId === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                View signed agreement
              </button>
            ) : (
              <p className="text-xs font-semibold text-amber-700">Legacy application: no signed organizer agreement stored.</p>
            )}
            {app.signed_at && (
              <p className="mt-2 text-xs text-slate-500">Signed by {app.signer_name} on {new Date(app.signed_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions / Status */}
      <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
        {app.status === "pending" ? (
          <>
            <button
              onClick={() => onAction(app.id, "approve")}
              disabled={isProcessing}
              className="w-full md:w-32 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => onAction(app.id, "reject")}
              disabled={isProcessing}
              className="w-full md:w-32 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </button>
          </>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${
              app.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              {app.status === "approved" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {app.status === "approved" ? "Approved" : "Rejected/Blocked"}
            </div>
            {app.status === "approved" && (
              <button
                onClick={() => onAction(app.id, "block")}
                disabled={isProcessing}
                className="w-full text-xs flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg font-semibold transition-colors disabled:opacity-50 mt-1"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Block Business
              </button>
            )}
            {app.status === "rejected" && (
              <button
                onClick={() => onAction(app.id, "unblock")}
                disabled={isProcessing}
                className="w-full text-xs flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg font-semibold transition-colors disabled:opacity-50 mt-1"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Unblock Business
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
