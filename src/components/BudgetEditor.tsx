"use client";

import { useState, useEffect } from "react";
import { Wallet, Check, Loader2, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  initialBudget?: { budget_min: number; budget_max: number } | null;
}

export default function BudgetEditor({ onClose, onSaved, initialBudget }: Props) {
  const [min, setMin] = useState(initialBudget?.budget_min?.toString() || "");
  const [max, setMax] = useState(initialBudget?.budget_max?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialBudget) {
      setMin(initialBudget.budget_min?.toString() || "");
      setMax(initialBudget.budget_max?.toString() || "");
    }
  }, [initialBudget]);

  const minVal = parseInt(min);
  const maxVal = parseInt(max);
  const isValid = !isNaN(minVal) && !isNaN(maxVal) && minVal > 0 && maxVal > 0 && minVal <= maxVal;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/compatibility/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_min: minVal, budget_max: maxVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full animate-slide-up">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 px-6 py-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Trip Budget</h2>
                <p className="text-white/70 text-xs">Set your per-trip budget range</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Minimum Budget (₹)
            </label>
            <input
              type="number"
              min={1}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-slate-900 font-medium transition text-base"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Maximum Budget (₹)
            </label>
            <input
              type="number"
              min={1}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-slate-900 font-medium transition text-base"
            />
          </div>

          {/* Validation feedback */}
          {min && max && minVal > maxVal && (
            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
              ⚠️ Min budget cannot exceed max budget
            </p>
          )}

          {isValid && (
            <div className="flex items-center gap-2 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">
                ₹{minVal.toLocaleString('en-IN')} – ₹{maxVal.toLocaleString('en-IN')} per trip
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-500 font-semibold">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Budget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
