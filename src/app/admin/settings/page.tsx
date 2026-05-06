"use client";

import { useState, useEffect } from "react";
import { Save, Shield, Bell, Loader2 } from "lucide-react";

interface SettingsData {
  auto_approve_trips: number;
  feedback_alerts: number;
  maintenance_mode: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            auto_approve_trips: data.settings.auto_approve_trips,
            feedback_alerts: data.settings.feedback_alerts,
            maintenance_mode: data.settings.maintenance_mode,
          });
        } else {
          setError(data.error || "Failed to load settings");
        }
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SettingsData, value: number) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
            saved
              ? "bg-emerald-500 text-white shadow-emerald-500/20"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 hover:shadow-orange-500/30 disabled:opacity-50"
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Moderation Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Moderation</h2>
          </div>
          <div className="p-6 space-y-4">
            <ToggleRow
              label="Auto-approve trips from verified businesses"
              description="Skip the moderation queue for businesses that are already verified."
              checked={!!settings.auto_approve_trips}
              onChange={(val) => updateSetting("auto_approve_trips", val ? 1 : 0)}
            />
            <ToggleRow
              label="Maintenance mode"
              description="Temporarily disable the public site. Only admins can access."
              checked={!!settings.maintenance_mode}
              onChange={(val) => updateSetting("maintenance_mode", val ? 1 : 0)}
              danger
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Notifications
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <ToggleRow
              label="Feedback alerts"
              description="Get notified immediately when new user feedback is submitted."
              checked={!!settings.feedback_alerts}
              onChange={(val) => updateSetting("feedback_alerts", val ? 1 : 0)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable toggle row component */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 pr-4">
        <p className={`text-sm font-semibold ${danger ? "text-rose-600" : "text-slate-900"}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked
            ? danger
              ? "bg-rose-500"
              : "bg-orange-500"
            : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
