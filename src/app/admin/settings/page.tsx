"use client";

import { useState, useEffect } from "react";
import { Save, Shield, Bell, Loader2, UserPlus, Trash2, Mail } from "lucide-react";

interface SettingsData {
  auto_approve_trips: number;
  feedback_alerts: number;
  maintenance_mode: number;
}

interface AdminAccount {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [superAdminEmail, setSuperAdminEmail] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchAdminAccounts = async () => {
    const res = await fetch("/api/admin/accounts");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load administrators");
    setAdmins(data.admins || []);
    setSuperAdminEmail(data.superAdminEmail || "");
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((res) => res.json()),
      fetchAdminAccounts(),
    ])
      .then(([data]) => {
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
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    setAdminSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add administrator");
        return;
      }

      setNewAdminEmail("");
      await fetchAdminAccounts();
    } catch {
      setError("Failed to add administrator");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    setAdminSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to remove administrator");
        return;
      }

      await fetchAdminAccounts();
    } catch {
      setError("Failed to remove administrator");
    } finally {
      setAdminSaving(false);
    }
  };

  const updateSetting = (key: keyof SettingsData, value: number) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-500 font-medium">
        {error || "Failed to load settings"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Application controls and administrator access</p>
        </div>
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
          {saved ? "Saved" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Administrator Access</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Super Admin</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className="w-4 h-4 text-purple-500" />
                {superAdminEmail || "Not configured"}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                This account is controlled by SUPER_ADMIN_EMAIL and cannot be removed from the panel.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm font-medium"
              />
              <button
                onClick={handleAddAdmin}
                disabled={adminSaving || !newAdminEmail.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {adminSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Admin
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              {admins.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No administrator emails found.</div>
              ) : (
                admins.map((admin) => {
                  const isSuper = admin.email.toLowerCase() === superAdminEmail.toLowerCase();
                  return (
                    <div key={admin.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{admin.email}</p>
                          {isSuper && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Super
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">Added by {admin.added_by || "system"}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(admin.email)}
                        disabled={adminSaving || isSuper}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                        title={isSuper ? "Super admin cannot be removed" : "Remove admin"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
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
          checked ? (danger ? "bg-rose-500" : "bg-orange-500") : "bg-slate-200"
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