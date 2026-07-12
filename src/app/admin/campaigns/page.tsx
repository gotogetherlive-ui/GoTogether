"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Gift, Loader2, Mail, Send, UserRound, Users } from "lucide-react";

type CampaignType = "retention" | "notification" | "offer";
type Audience = "specific" | "all";

interface AdminUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

const campaignOptions = [
  { value: "retention" as const, label: "Retention", description: "Bring inactive users back", icon: UserRound },
  { value: "notification" as const, label: "Notification", description: "Share an important update", icon: Bell },
  { value: "offer" as const, label: "Offer", description: "Promote a deal or benefit", icon: Gift },
];

export default function AdminCampaignsPage() {
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [campaignType, setCampaignType] = useState<CampaignType>("retention");
  const [audience, setAudience] = useState<Audience>("specific");
  const [targetUserId, setTargetUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/users", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load users");
        return response.json();
      })
      .then((data) => setUsers(data.users || []))
      .catch(() => { if (!controller.signal.aborted) setError("Could not load the user directory."); })
      .finally(() => { if (!controller.signal.aborted) setLoadingUsers(false); });
    return () => controller.abort();
  }, []);

  const selectedUser = useMemo(() => users.find((user) => user.id === targetUserId), [users, targetUserId]);
  const recipientLabel = audience === "all" ? `${users.length} active users` : selectedUser ? selectedUser.email : "No user selected";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (audience === "all" && !confirmAll) {
      setError("Confirm that you want to send this campaign to all users.");
      return;
    }
    if (audience === "all" && !window.confirm(`Send this email to all ${users.length} active users?`)) return;

    setSending(true);
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignType, audience, targetUserId, subject, message, ctaLabel, ctaUrl, confirmAll }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The campaign could not be sent.");
        return;
      }
      setSuccess(`Campaign sent successfully to ${data.sent} recipient${data.sent === 1 ? "" : "s"}.`);
      setSubject("");
      setMessage("");
      setCtaLabel("");
      setCtaUrl("");
      setConfirmAll(false);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-orange-100 p-3 text-orange-600"><Mail className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">User Campaigns</h1>
            <p className="mt-1 text-slate-500">Send retention, notification, or offer emails to one user or your full user base.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <label className="mb-3 block text-sm font-bold text-slate-800">Campaign type</label>
            <div className="grid gap-3 md:grid-cols-3">
              {campaignOptions.map((option) => {
                const Icon = option.icon;
                const active = campaignType === option.value;
                return <button key={option.value} type="button" onClick={() => setCampaignType(option.value)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}>
                  <Icon className={`mb-3 h-5 w-5 ${active ? "text-orange-600" : "text-slate-400"}`} />
                  <span className="block font-bold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                </button>;
              })}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-slate-800">Audience</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { setAudience("specific"); setConfirmAll(false); }} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${audience === "specific" ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200"}`}><UserRound className="h-5 w-5" /><span><strong className="block">Specific user</strong><small className="text-slate-500">Send to one account</small></span></button>
              <button type="button" onClick={() => setAudience("all")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${audience === "all" ? "border-rose-400 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200"}`}><Users className="h-5 w-5" /><span><strong className="block">All users</strong><small className="text-slate-500">Send to every active account</small></span></button>
            </div>
          </div>

          {audience === "specific" ? (
            <div>
              <label htmlFor="recipient" className="mb-2 block text-sm font-bold text-slate-800">Recipient</label>
              <select id="recipient" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-400">
                <option value="">{loadingUsers ? "Loading users…" : "Select a user"}</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name || "Unnamed user"} — {user.email}</option>)}
              </select>
            </div>
          ) : (
            <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <input type="checkbox" checked={confirmAll} onChange={(event) => setConfirmAll(event.target.checked)} className="mt-1" />
              <span><strong className="block">Confirm all-user delivery</strong>This campaign will be sent individually to all {users.length} active users.</span>
            </label>
          )}

          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-bold text-slate-800">Email subject</label>
            <input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={150} required placeholder="A concise, useful subject" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            <p className="mt-1 text-right text-xs text-slate-400">{subject.length}/150</p>
          </div>

          <div>
            <label htmlFor="message" className="mb-2 block text-sm font-bold text-slate-800">Message</label>
            <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required rows={9} placeholder="Write the campaign message…" className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 leading-relaxed outline-none focus:border-orange-400" />
            <p className="mt-1 text-right text-xs text-slate-400">{message.length}/5000</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div><label htmlFor="ctaLabel" className="mb-2 block text-sm font-bold text-slate-800">Button text <span className="font-normal text-slate-400">(optional)</span></label><input id="ctaLabel" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={50} placeholder="Explore Trips" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" /></div>
            <div><label htmlFor="ctaUrl" className="mb-2 block text-sm font-bold text-slate-800">Button URL <span className="font-normal text-slate-400">(optional)</span></label><input id="ctaUrl" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} maxLength={500} placeholder="/trips or https://…" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" /></div>
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}

          <button type="submit" disabled={sending || loadingUsers || (audience === "specific" && !targetUserId) || (audience === "all" && !confirmAll)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4 font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{sending ? "Sending campaign…" : "Send Campaign"}
          </button>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm xl:sticky xl:top-8">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Delivery summary</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-slate-400">Type</dt><dd className="mt-1 font-bold capitalize">{campaignType}</dd></div>
            <div><dt className="text-slate-400">Audience</dt><dd className="mt-1 font-bold">{recipientLabel}</dd></div>
            <div><dt className="text-slate-400">Delivery</dt><dd className="mt-1 text-slate-200">Individual branded emails in private batches</dd></div>
          </dl>
          <div className="mt-6 rounded-2xl bg-white/5 p-4 text-xs leading-relaxed text-slate-400">Review the subject, message, audience, and campaign link carefully. Sending cannot be undone after delivery begins.</div>
        </aside>
      </form>
    </div>
  );
}