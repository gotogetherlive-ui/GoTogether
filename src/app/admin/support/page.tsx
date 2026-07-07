"use client";

import { useEffect, useState } from "react";
import { Headset, Loader2, RefreshCw, X, Clock, User, Mail, Phone, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Ticket {
  id: string; full_name: string; email: string; phone: string | null; category: string;
  subject: string; message: string; status: string; admin_notes: string | null;
  created_at: string; user_account_name: string | null; user_avatar: string | null;
  user_phone: string | null; user_age: number | null; user_gender: string | null;
}

interface TicketDetail extends Ticket {
  user_id: string | null; user_account_email: string | null;
  user_role: string | null; user_joined: string | null;
}

const CAT_STYLES: Record<string, { label: string; bg: string; text: string; gradient: string; glow: string }> = {
  general: { label: "General", bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/20" },
  safety: { label: "Safety", bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-red-600", glow: "shadow-rose-500/20" },
  billing: { label: "Billing", bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/20" },
  account: { label: "Account", bg: "bg-violet-50", text: "text-violet-600", gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/20" },
  trip: { label: "Trip", bg: "bg-orange-50", text: "text-orange-600", gradient: "from-orange-500 to-amber-600", glow: "shadow-orange-500/20" },
  other: { label: "Other", bg: "bg-slate-50", text: "text-slate-600", gradient: "from-slate-500 to-slate-700", glow: "shadow-slate-500/20" },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "🔸 Open", bg: "bg-amber-100", text: "text-amber-700" },
  in_progress: { label: "🔄 In Progress", bg: "bg-blue-100", text: "text-blue-700" },
  resolved: { label: "✅ Resolved", bg: "bg-emerald-100", text: "text-emerald-700" },
  closed: { label: "⬛ Closed", bg: "bg-slate-200", text: "text-slate-600" },
};

function timeAgo(dateStr: string): string {
  let n = dateStr;
  if (!n.endsWith('Z') && !n.includes('+') && !n.includes('T')) n = n.replace(' ', 'T') + 'Z';
  else if (!n.endsWith('Z') && !n.includes('+') && n.includes('T') && n.length <= 19) n += 'Z';
  const d = new Date(n), now = new Date(), ms = now.getTime() - d.getTime(), m = Math.floor(ms / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`);
      const data = await res.json();
      setSelected(data.ticket);
    } catch { alert("Failed to load ticket"); }
    finally { setDetailLoading(false); }
  };

  const updateStatus = async (newStatus: string) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await fetch(`/api/admin/support/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setSelected({ ...selected, status: newStatus });
      fetchTickets();
    } catch { alert("Failed to update"); }
    finally { setUpdating(false); }
  };

  const filtered = tickets.filter(t => filter === "all" || t.status === filter);
  const counts = { open: tickets.filter(t => t.status === "open").length, in_progress: tickets.filter(t => t.status === "in_progress").length, resolved: tickets.filter(t => t.status === "resolved").length };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" /><p className="text-sm text-slate-500">Loading support tickets…</p></div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1><p className="text-sm text-slate-500 mt-1">Manage user support requests and concerns</p></div>
        <button onClick={fetchTickets} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-medium">Total</p><p className="text-2xl font-bold text-slate-900 mt-1">{tickets.length}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm"><p className="text-xs text-amber-600 font-medium">Open</p><p className="text-2xl font-bold text-amber-600 mt-1">{counts.open}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm"><p className="text-xs text-blue-600 font-medium">In Progress</p><p className="text-2xl font-bold text-blue-600 mt-1">{counts.in_progress}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm"><p className="text-xs text-emerald-600 font-medium">Resolved</p><p className="text-2xl font-bold text-emerald-600 mt-1">{counts.resolved}</p></div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-5">
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${filter === f ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
            {f === "all" ? "All" : STATUS_STYLES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4"><Headset className="w-8 h-8 text-orange-400" /></div>
          <p className="text-lg font-semibold text-slate-700">No tickets found</p>
          <p className="text-sm text-slate-400 mt-1">{filter !== "all" ? `No ${filter} tickets.` : "No support tickets yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, idx) => {
            const cat = CAT_STYLES[t.category] || CAT_STYLES.other;
            const st = STATUS_STYLES[t.status] || STATUS_STYLES.open;
            return (
              <div key={t.id} onClick={() => openDetail(t.id)}
                className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white shadow-lg ${cat.glow} flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Headset className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-orange-600 transition-colors">{t.subject}</h3>
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{t.message}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.bg} ${st.text}`}>{t.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                      <span className={`inline-flex items-center gap-1 ${cat.text} font-semibold`}>{cat.label}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.full_name}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>
                      <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{timeAgo(t.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {(selected || detailLoading) && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => !detailLoading && setSelected(null)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {detailLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
              ) : selected ? (() => {
                const cat = CAT_STYLES[selected.category] || CAT_STYLES.other;
                const st = STATUS_STYLES[selected.status] || STATUS_STYLES.open;
                return (
                  <>
                    <div className={`relative h-20 bg-gradient-to-r ${cat.gradient} rounded-t-3xl`}>
                      <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                      <div className="absolute -bottom-6 left-6"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white shadow-xl ${cat.glow} border-4 border-white`}><Headset className="w-6 h-6" /></div></div>
                    </div>
                    <div className="px-6 pt-10 pb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider ${cat.text}`}>{cat.label} Issue</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">{selected.subject}</h2>
                      <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                      </div>

                      {/* Contact Info */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-100 mb-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Contact Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-slate-400" /><span className="font-semibold text-slate-800">{selected.full_name}</span></div>
                          <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{selected.email}</span></div>
                          {selected.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-slate-400" /><span className="text-slate-600">{selected.phone}</span></div>}
                        </div>
                        {selected.user_id && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Registered User</p>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                {selected.user_avatar ? <img src={selected.user_avatar} alt="" className="w-full h-full object-cover" /> : (selected.user_account_name?.charAt(0)?.toUpperCase() || "U")}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{selected.user_account_name || "—"}</p>
                                <p className="text-[10px] text-slate-400">{selected.user_role} • {selected.user_gender || "—"} {selected.user_age ? `• Age ${selected.user_age}` : ""}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-5">
                        <Clock className="w-3.5 h-3.5" />
                        Submitted on {new Date(selected.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                      </p>

                      {/* Status Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        {selected.status !== "in_progress" && selected.status !== "resolved" && (
                          <button onClick={() => updateStatus("in_progress")} disabled={updating} className="py-2.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                            <ArrowRight className="w-3.5 h-3.5" /> Mark In Progress
                          </button>
                        )}
                        {selected.status !== "resolved" && (
                          <button onClick={() => updateStatus("resolved")} disabled={updating} className="py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                          </button>
                        )}
                        {selected.status === "resolved" && (
                          <button onClick={() => updateStatus("open")} disabled={updating} className="py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 col-span-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Reopen Ticket
                          </button>
                        )}
                        {selected.status !== "closed" && selected.status !== "resolved" && (
                          <button onClick={() => updateStatus("closed")} disabled={updating} className="py-2.5 rounded-xl text-xs font-bold bg-slate-400 hover:bg-slate-500 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                            <X className="w-3.5 h-3.5" /> Close
                          </button>
                        )}
                      </div>
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
