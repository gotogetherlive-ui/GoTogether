"use client";

import { useEffect, useState } from "react";
import { MailCheck, Plus, Play, Loader2, Edit2, Trash2, Power, Settings2, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface RetentionRule {
  id: string;
  name: string;
  inactive_days: number;
  subject: string;
  body_html: string;
  is_active: number;
  last_run_at: string | null;
  total_sent: number;
}

interface RetentionLog {
  id: string;
  rule_id: string;
  user_id: string;
  email: string;
  sent_at: string;
  status: string;
  user_name: string;
  rule_name: string;
}

export default function AdminRetentionPage() {
  const [rules, setRules] = useState<RetentionRule[]>([]);
  const [recentLogs, setRecentLogs] = useState<RetentionLog[]>([]);
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RetentionRule | null>(null);
  const [formData, setFormData] = useState({ name: "", inactive_days: 7, subject: "", body_html: "" });
  const [saving, setSaving] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/retention");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setRecentLogs(data.recentLogs || []);
        setTotalEmailsSent(data.totalEmailsSent || 0);
      } else {
        throw new Error("Failed to load rules");
      }
    } catch {
      setError("Failed to load retention rules. Please retry.");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (rule?: RetentionRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        inactive_days: rule.inactive_days,
        subject: rule.subject,
        body_html: rule.body_html,
      });
    } else {
      setEditingRule(null);
      setFormData({ name: "", inactive_days: 7, subject: "", body_html: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingRule ? `/api/admin/retention/${editingRule.id}` : "/api/admin/retention";
      const method = editingRule ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        closeModal();
        fetchData();
      } else {
        alert("Failed to save rule");
      }
    } catch {
      alert("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: number) => {
    try {
      await fetch(`/api/admin/retention/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 }),
      });
      fetchData();
    } catch {
      alert("Failed to toggle rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the rule and all its logs.")) return;
    try {
      await fetch(`/api/admin/retention/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      alert("Failed to delete rule");
    }
  };

  const handleRunNow = async () => {
    if (!confirm("Execute all active rules now? This will send emails to matching inactive users.")) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/retention/run", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setRunResult({
          message: data.message,
          type: data.totalSent > 0 ? "success" : "info"
        });
        fetchData();
      } else {
        setRunResult({ message: data.error || "Failed to run rules", type: "error" });
      }
    } catch {
      setRunResult({ message: "An error occurred while running rules", type: "error" });
    } finally {
      setRunning(false);
    }
  };

  if (loading && rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error && rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3">
          <p className="text-rose-500 font-medium">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 animate-spin" /> Retry
        </button>
      </div>
    );
  }

  const activeRulesCount = rules.filter(r => r.is_active).length;

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Retention Emails</h1>
          <p className="text-sm text-slate-500 mt-1">Automated re-engagement campaigns for inactive users</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className={`flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all duration-300 hover:shadow-sm bg-white shadow-sm ${loading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={handleRunNow}
            disabled={running || activeRulesCount === 0}
            className="flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {running ? "Executing..." : "Run Active Rules Now"}
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Error banner if rules exist but refresh failed */}
      {error && rules.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {error}
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 transition-colors font-bold text-lg leading-none">
            &times;
          </button>
        </div>
      )}

      {/* Run Result Alert */}
      {runResult && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${runResult.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            runResult.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" :
              "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
          {runResult.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-semibold text-sm">{runResult.message}</p>
          <button onClick={() => setRunResult(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
            <MailCheck className="w-5 h-5" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{totalEmailsSent}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Total Emails Sent</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
            <Settings2 className="w-5 h-5" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{rules.length}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Total Automation Rules</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
            <Power className="w-5 h-5" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{activeRulesCount}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Active Rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Automation Rules</h2>
          {rules.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center border-dashed">
              <MailCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No retention rules created yet.</p>
              <button onClick={() => openModal()} className="text-orange-500 font-semibold text-sm mt-2 hover:underline">Create your first rule</button>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className={`bg-white p-5 rounded-2xl border transition-all duration-200 ${rule.is_active ? 'border-indigo-100 shadow-sm' : 'border-slate-100 opacity-75'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-slate-900 text-lg">{rule.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Triggers after <strong className="text-slate-700">{rule.inactive_days} days</strong> of inactivity
                    </p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                      Subject: <span className="text-slate-700 italic">"{rule.subject}"</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="text-right mr-4 hidden sm:block">
                      <p className="text-xl font-bold text-slate-900">{rule.total_sent}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Sent</p>
                    </div>

                    <button
                      onClick={() => handleToggleActive(rule.id, rule.is_active)}
                      className={`p-2 rounded-lg transition-colors ${rule.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={rule.is_active ? 'Pause Rule' : 'Activate Rule'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => openModal(rule)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Logs */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No emails sent yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm text-slate-900 truncate pr-4">{log.user_name || log.email}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-2">{log.rule_name}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.sent_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingRule ? "Edit Rule" : "Create Retention Rule"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rule Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 7-Day Inactive Check-in"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Inactive Days Threshold</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.inactive_days}
                    onChange={(e) => setFormData({ ...formData, inactive_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Subject</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. We miss you, {{name}}! 🌍"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all"
                />
                <p className="text-xs text-slate-500 mt-1.5">Supports variables: <code>{`{{name}}`}</code></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Body (HTML)</label>
                <textarea
                  required
                  rows={8}
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  placeholder={`<p style="color: #334155; font-size: 16px;">Hi {{name}},</p>\n<p style="color: #64748b; font-size: 15px;">It's been a while since your last visit. We have some exciting new trips waiting for you!</p>\n<a href="https://gotogether.live" style="...">Explore Trips</a>`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all font-mono"
                />
                <p className="text-xs text-slate-500 mt-1.5">Supports variables: <code>{`{{name}}`}</code>, <code>{`{{email}}`}</code></p>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.subject || !formData.body_html}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-md shadow-orange-500/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingRule ? "Save Changes" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
