"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { X, MessageSquare, Send, Loader2, CheckCircle, AlertTriangle, Bug, MapPin, Compass, Sparkles, Heart, Star } from "lucide-react";
import { apiJson } from "@/lib/apiClient";

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
  {
    value: "love",
    label: "I Like GoTogether",
    description: "Share what you enjoyed and rate us",
    icon: Heart,
    gradient: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    activeBg: "bg-pink-50",
    ring: "ring-pink-300",
    glow: "shadow-pink-500/20",
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
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setCategory("");
      setSubject("");
      setDescription("");
      setRating(0);
      setSubmitted(false);
      setError("");
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // Animate entrance
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setVisible(true);
        closeButtonRef.current?.focus();
      });
    } else {
      queueMicrotask(() => setVisible(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen]);

  const isPraise = category === "love";
  const isValid = Boolean(category && subject.trim() && description.trim() && (!isPraise || rating >= 1));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError("");

    try {
      await apiJson("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category, subject: subject.trim(), description: description.trim(), rating: isPraise ? rating : null }),
      }, { timeoutMs: 12000 });

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      <div className="gt-viewport-modal fixed inset-0 z-[101] flex items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          className={`gt-viewport-dialog w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl transition-all duration-300 ${
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
                  <h2 id="feedback-dialog-title" className="text-lg font-bold text-slate-900">Send Feedback</h2>
                  <p className="text-xs text-slate-500">Help us improve GoTogether</p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close feedback dialog"
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
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
                <h3 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h3>
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const selected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => { setCategory(cat.value); setError(""); if (cat.value !== "love") setRating(0); }}
                          className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 group ${
                            selected
                              ? `${cat.activeBg} ${cat.border} ring-2 ${cat.ring} shadow-md ${cat.glow}`
                              : `border-slate-200 hover:border-slate-300 hover:bg-slate-50`
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            selected
                              ? `bg-gradient-to-br ${cat.gradient} text-white shadow-lg ${cat.glow}`
                              : `${cat.bg} `
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
                              <CheckCircle className={`w-5 h-5 ${cat.value === 'technical' ? 'text-red-500' : cat.value === 'trip' ? 'text-blue-500' : cat.value === 'love' ? 'text-pink-500' : 'text-orange-500'}`} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isPraise && (
                  <fieldset className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-center">
                    <legend className="px-2 text-xs font-bold uppercase tracking-wider text-amber-800">How much do you like GoTogether? *</legend>
                    <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="GoTogether rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => { setRating(value); setError(""); }} className="rounded-xl p-1.5 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
                          <Star className={`h-8 w-8 transition ${value <= rating ? "fill-amber-400 text-amber-500 drop-shadow-sm" : "text-amber-200 hover:text-amber-300"}`} />
                        </button>
                      ))}
                    </div>
                    <p aria-live="polite" className="mt-2 text-sm font-semibold text-amber-900">{rating ? ["", "Needs improvement", "It was okay", "Good experience", "Really enjoyed it", "Absolutely loved it"][rating] : "Select a rating"}</p>
                  </fieldset>
                )}

                {/* Subject */}
                <div>
                  <label htmlFor="feedback-subject" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Subject *
                  </label>
                  <input
                    id="feedback-subject"
                    name="feedback-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => { setSubject(e.target.value); setError(""); }}
                    placeholder={isPraise ? "What did you like most?" : "Brief summary of the issue"}
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
                  <label htmlFor="feedback-description" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description *
                  </label>
                  <textarea
                    id="feedback-description"
                    name="feedback-description"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setError(""); }}
                    placeholder={isPraise ? "Tell us what made your experience enjoyable..." : "Please describe the issue in detail..."}
                    rows={4}
                    maxLength={5000}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 font-medium transition-all duration-300 resize-none text-sm hover:border-slate-300"
                  />
                  <div className="mt-1 flex justify-end">
                    <span className={`text-[10px] font-medium transition-colors ${description.length > 4500 ? "text-amber-500" : "text-slate-300"}`}>
                      {description.length}/5000
                    </span>
                  </div>
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
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all duration-200 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
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
          </form>
        </div>
      </div>
    </>
  );
}
