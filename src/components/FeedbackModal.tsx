"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Send, Loader2, CheckCircle, AlertTriangle, Bug, MapPin, Compass, Sparkles } from "lucide-react";

const CATEGORIES = [
  {
    value: "technical",
    label: "Technical Issue",
    description: "Bugs, errors, or broken features",
    icon: Bug,
    gradient: "from-red-500 to-rose-600",
    bg: "bg-red-50",
    border: "border-red-200",
    activeBg: "bg-red-100",
    ring: "ring-red-300",
    glow: "shadow-red-500/20",
  },
  {
    value: "trip",
    label: "Trip Issue",
    description: "Problems with trips or bookings",
    icon: MapPin,
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBg: "bg-blue-100",
    ring: "ring-blue-300",
    glow: "shadow-blue-500/20",
  },
  {
    value: "gotogether",
    label: "GoTogether Issue",
    description: "Platform suggestions or concerns",
    icon: Compass,
    gradient: "from-orange-500 to-amber-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    activeBg: "bg-orange-100",
    ring: "ring-orange-300",
    glow: "shadow-orange-500/20",
  },
];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  // Animate entrance
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const isValid = category && subject.trim() && description.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject: subject.trim(), description: description.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setCategory("");
      setSubject("");
      setDescription("");
      setSubmitted(false);
      setError("");
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  const selectedCat = CATEGORIES.find(c => c.value === category);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transition-all duration-300 ${
            visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${
              selectedCat ? selectedCat.gradient : "from-orange-400 via-rose-400 to-pink-500"
            } transition-all duration-500`} />
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${
                  selectedCat ? selectedCat.gradient : "from-orange-400 to-rose-500"
                } flex items-center justify-center text-white shadow-lg ${
                  selectedCat ? selectedCat.glow : "shadow-orange-500/20"
                } transition-all duration-500`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Send Feedback</h2>
                  <p className="text-xs text-slate-500">Help us improve GoTogether</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {submitted ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5 animate-bounce">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-ping">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You! 🎉</h3>
                <p className="text-slate-500 text-sm max-w-xs">
                  Your feedback has been submitted successfully. Our team will review it shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    What&apos;s this about? *
                  </label>
                  <div className="space-y-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const selected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 group ${
                            selected
                              ? `${cat.activeBg} ${cat.border} ring-2 ${cat.ring} shadow-md ${cat.glow}`
                              : `border-slate-200 hover:border-slate-300 hover:bg-slate-50`
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            selected
                              ? `bg-gradient-to-br ${cat.gradient} text-white shadow-lg ${cat.glow}`
                              : `${cat.bg} group-hover:scale-110`
                          }`}>
                            <Icon className={`w-5 h-5 ${selected ? "text-white" : "text-slate-500"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold transition-colors ${selected ? "text-slate-900" : "text-slate-700"}`}>
                              {cat.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                          </div>
                          {selected && (
                            <div className="ml-auto">
                              <CheckCircle className={`w-5 h-5 ${cat.value === 'technical' ? 'text-red-500' : cat.value === 'trip' ? 'text-blue-500' : 'text-orange-500'}`} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    maxLength={150}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition-all duration-300 text-sm hover:border-slate-300"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-[10px] font-medium transition-colors ${subject.length > 120 ? "text-amber-500" : "text-slate-300"}`}>
                      {subject.length}/150
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe the issue in detail..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition-all duration-300 resize-none text-sm hover:border-slate-300"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-medium animate-in slide-in-from-top-1 duration-200">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!submitted && (
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all duration-200 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                  selectedCat
                    ? `bg-gradient-to-r ${selectedCat.gradient} ${selectedCat.glow} hover:shadow-xl`
                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
