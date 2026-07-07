"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Headset, X, Send, Loader2, CheckCircle2 } from "lucide-react";

export default function ContactSupportModal({ open, onClose, defaultCategory }: { open: boolean; onClose: () => void; defaultCategory?: string }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", category: defaultCategory || "general", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fill user info when modal opens
  useEffect(() => {
    if (open && !form.full_name && !form.email) {
      fetch("/api/auth/me")
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setForm(f => ({
              ...f,
              full_name: f.full_name || data.user.full_name || "",
              email: f.email || data.user.email || "",
              phone: f.phone || data.user.phone_number || "",
            }));
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Reset on close
  const handleClose = () => {
    setSuccess(false);
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={handleClose} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 animate-[slideUp_0.3s_ease]">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {success ? (
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">Your support request has been submitted. Our team will get back to you within 24 hours.</p>
              <button onClick={handleClose} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="relative h-20 bg-gradient-to-r from-orange-500 to-rose-500 rounded-t-3xl">
                <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute -bottom-6 left-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 border-4 border-white">
                    <Headset className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="px-6 pt-10 pb-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Contact Support</h2>
                  <p className="text-sm text-slate-500 mt-1">Fill in the details below and we&apos;ll get back to you.</p>
                </div>
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl p-3 flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name *</label>
                    <input type="text" required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all bg-slate-50/50" placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                    <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all bg-slate-50/50" placeholder="your@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone (optional)</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all bg-slate-50/50" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Category *</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all bg-slate-50/50">
                      <option value="general">General Inquiry</option>
                      <option value="safety">Safety Concern</option>
                      <option value="billing">Billing Issue</option>
                      <option value="account">Account Help</option>
                      <option value="trip">Trip Related</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Subject *</label>
                  <input type="text" required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all bg-slate-50/50" placeholder="Brief description of your issue" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Message *</label>
                  <textarea required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all resize-none bg-slate-50/50" placeholder="Please describe your concern in detail..." />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-rose-600 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
