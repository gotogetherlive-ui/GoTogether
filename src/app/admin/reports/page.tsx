"use client";

import {
  CheckCircle, AlertTriangle, Loader2, MessageSquare, X,
  Bug, MapPin, Compass, Clock, User, Mail, Phone, RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ────── Feedback Types ────── */
interface FeedbackData {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
}

interface FeedbackDetail {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  user_age: number | null;
  user_gender: string | null;
  user_avatar: string | null;
}

/* ────── Category Styles ────── */
const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bug; gradient: string; bg: string; text: string; border: string; glow: string }> = {
  technical: {
    label: "Technical",
    icon: Bug,
    gradient: "from-red-500 to-rose-600",
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    glow: "shadow-red-500/20",
  },
  trip: {
    label: "Trip",
    icon: MapPin,
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    glow: "shadow-blue-500/20",
  },
  gotogether: {
    label: "GoTogether",
    icon: Compass,
    gradient: "from-orange-500 to-amber-600",
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    glow: "shadow-orange-500/20",
  },
};

/* ────── Time Ago Helper ────── */
function timeAgo(dateStr: string): string {
  // Ensure UTC interpretation: if no timezone marker, treat as UTC
  let normalized = dateStr;
  if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T') + 'Z';
  } else if (!normalized.endsWith('Z') && !normalized.includes('+') && normalized.includes('T') && normalized.length <= 19) {
    normalized = normalized + 'Z';
  }
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */
export default function AdminFeedbackPage() {
  /* ── State ── */
  // Feedbacks
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);
  const [feedbacksError, setFeedbacksError] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "pending" | "solved">("all");

  // Feedback Detail Modal
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  /* ── Fetch Feedbacks ── */
  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    try {
      const res = await fetch("/api/admin/feedbacks");
      if (!res.ok) throw new Error("Failed to fetch feedbacks");
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch {
      setFeedbacksError("Failed to load feedbacks");
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  /* ── Open Feedback Detail ── */
  const openFeedbackDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedFeedback(data.feedback);
    } catch {
      alert("Failed to load feedback details");
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Toggle Feedback Status ── */
  const toggleFeedbackStatus = async () => {
    if (!selectedFeedback) return;
    const newStatus = selectedFeedback.status === "pending" ? "solved" : "pending";
    setTogglingStatus(true);
    try {
      const res = await fetch(`/api/admin/feedbacks/${selectedFeedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setSelectedFeedback({ ...selectedFeedback, status: newStatus });
      fetchFeedbacks();
    } catch {
      alert("Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  /* ── Filtered feedbacks ── */
  const filteredFeedbacks = feedbacks.filter((f) =>
    feedbackFilter === "all" ? true : f.status === feedbackFilter
  );

  const pendingCount = feedbacks.filter(f => f.status === "pending").length;
  const solvedCount = feedbacks.filter(f => f.status === "solved").length;

  /* ── Loading ── */
  if (feedbacksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading feedbacks…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feedback Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage user feedback submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFeedbacks()}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ════════════════════ FEEDBACKS ════════════════════ */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{feedbacks.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
            <p className="text-xs text-amber-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium">Solved</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{solvedCount}</p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-5">
          {(["all", "pending", "solved"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFeedbackFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                feedbackFilter === filter
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {filter === "all" ? "All" : filter === "pending" ? "🔸 Pending" : "✅ Solved"}
            </button>
          ))}
        </div>

        {/* Feedbacks List */}
        {feedbacksError ? (
          <div className="text-rose-500 font-medium">{feedbacksError}</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-lg font-semibold text-slate-700">No feedbacks found</p>
            <p className="text-sm text-slate-400 mt-1">
              {feedbackFilter !== "all" ? `No ${feedbackFilter} feedbacks.` : "No feedback submitted yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeedbacks.map((fb, idx) => {
              const catConfig = CATEGORY_CONFIG[fb.category] || CATEGORY_CONFIG.gotogether;
              const CatIcon = catConfig.icon;
              return (
                <div
                  key={fb.id}
                  onClick={() => openFeedbackDetail(fb.id)}
                  className={`group bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${catConfig.border} hover:${catConfig.border}`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Category Icon */}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center text-white shadow-lg ${catConfig.glow} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <CatIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate group-hover:text-orange-600 transition-colors">{fb.subject}</h3>
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{fb.description}</p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          fb.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {fb.status}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                        <span className={`inline-flex items-center gap-1 ${catConfig.text} font-semibold`}>
                          <CatIcon className="w-3 h-3" />
                          {catConfig.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {fb.user_name || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {fb.user_email}
                        </span>
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {timeAgo(fb.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════ FEEDBACK DETAIL MODAL ════════════════════ */}
      {(selectedFeedback || detailLoading) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !detailLoading && setSelectedFeedback(null)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                </div>
              ) : selectedFeedback ? (() => {
                const catConfig = CATEGORY_CONFIG[selectedFeedback.category] || CATEGORY_CONFIG.gotogether;
                const CatIcon = catConfig.icon;
                const initial = selectedFeedback.user_name?.charAt(0)?.toUpperCase() || "U";
                return (
                  <>
                    {/* Header Gradient */}
                    <div className={`relative h-20 bg-gradient-to-r ${catConfig.gradient} rounded-t-3xl`}>
                      <button
                        onClick={() => setSelectedFeedback(null)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute -bottom-6 left-6">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center text-white shadow-xl ${catConfig.glow} border-4 border-white`}>
                          <CatIcon className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pt-10 pb-6">
                      {/* Category + Status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider ${catConfig.text}`}>
                          {catConfig.label} Issue
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          selectedFeedback.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {selectedFeedback.status === "pending" ? "🔸 Pending" : "✅ Solved"}
                        </span>
                      </div>

                      {/* Subject */}
                      <h2 className="text-xl font-bold text-slate-900 mb-4">{selectedFeedback.subject}</h2>

                      {/* Description */}
                      <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {selectedFeedback.description}
                        </p>
                      </div>

                      {/* User Info Card */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-100 mb-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          Submitted By
                        </h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {selectedFeedback.user_avatar ? (
                              <img src={selectedFeedback.user_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{selectedFeedback.user_name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{selectedFeedback.user_email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedFeedback.user_phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {selectedFeedback.user_phone}
                            </div>
                          )}
                          {selectedFeedback.user_age && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Age: {selectedFeedback.user_age}
                            </div>
                          )}
                          {selectedFeedback.user_gender && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {selectedFeedback.user_gender}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-5">
                        <Clock className="w-3.5 h-3.5" />
                        Submitted on {new Date(selectedFeedback.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                      </p>

                      {/* Action Button */}
                      <button
                        onClick={toggleFeedbackStatus}
                        disabled={togglingStatus}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                          selectedFeedback.status === "pending"
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40"
                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 hover:shadow-amber-500/40"
                        } disabled:opacity-60`}
                      >
                        {togglingStatus ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : selectedFeedback.status === "pending" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {togglingStatus
                          ? "Updating…"
                          : selectedFeedback.status === "pending"
                          ? "Mark as Solved"
                          : "Reopen as Pending"}
                      </button>
                    </div>
                  </>
                );
              })() : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
