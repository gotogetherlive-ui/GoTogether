"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  { value: "retention" as const, label: "Retention", description: "Warm, personal re-engagement", icon: UserRound, active: "border-orange-400 bg-orange-50 ring-orange-100", iconColor: "text-orange-600" },
  { value: "notification" as const, label: "Notification", description: "Clean, focused service update", icon: Bell, active: "border-blue-400 bg-blue-50 ring-blue-100", iconColor: "text-blue-600" },
  { value: "offer" as const, label: "Offer", description: "Bold, high-impact promotion", icon: Gift, active: "border-violet-400 bg-violet-50 ring-violet-100", iconColor: "text-violet-600" },
];

const campaignCopy = {
  retention: { subject: "Your next adventure is waiting", message: "Remind travelers what they can discover and give them a warm reason to return.", cta: "Explore trips" },
  notification: { subject: "An important GoTogether update", message: "State what changed, why it matters, and whether the traveler needs to take action.", cta: "Review update" },
  offer: { subject: "A special travel offer for you", message: "Describe the benefit clearly, including important eligibility or booking conditions.", cta: "View offer" },
};

function PreviewBrand({ dark = false }: { dark?: boolean }) {
  return <span className="flex items-center gap-2.5"><Image src="/icon.svg" alt="" width={30} height={30} className="rounded-lg" /><strong className={dark ? "text-white" : "text-slate-950"}>GoTogether</strong></span>;
}

function CampaignPreview({ type, subject, message, ctaLabel, recipientName }: {
  type: CampaignType; subject: string; message: string; ctaLabel: string; recipientName: string;
}) {
  const copy = campaignCopy[type];
  const previewSubject = subject || copy.subject;
  const previewMessage = message || copy.message;
  const previewButton = ctaLabel || copy.cta;
  const name = recipientName || "Traveler";

  if (type === "retention") return <div className="overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-xl shadow-orange-950/10">
    <div className="flex items-center justify-between px-5 py-4"><PreviewBrand /><span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-orange-700">Your next chapter</span></div>
    <div className="bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 px-5 py-8"><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-orange-700">Welcome back</span><h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-orange-950">{previewSubject}</h3><p className="mt-2 text-xs text-orange-800">Hi {name}, the road is better with good company.</p></div>
    <div className="p-5"><p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span><div className="mt-5 rounded-xl bg-orange-50 p-3 text-[10px] leading-4 text-orange-900"><strong className="block">Pick up where you left off</strong>Turn a saved idea into a real plan.</div></div>
  </div>;

  if (type === "notification") return <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><PreviewBrand /><span className="text-[10px] text-slate-500">Account update</span></div>
    <div className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-600">i</div><p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-blue-600">Important notification</p><h3 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-950">{previewSubject}</h3><p className="mt-5 text-xs text-slate-600">Hello {name},</p><p className="mt-3 whitespace-pre-wrap border-l-[3px] border-blue-600 pl-4 text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span><p className="mt-5 border-t border-slate-100 pt-4 text-[10px] leading-4 text-slate-400">Official service message from GoTogether.</p></div>
  </div>;

  return <div className="overflow-hidden rounded-[24px] bg-white shadow-2xl shadow-violet-950/20">
    <div className="flex items-center justify-between bg-[#24124d] px-5 py-4"><PreviewBrand dark /><span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-violet-200">Member offer</span></div>
    <div className="bg-gradient-to-br from-violet-800 via-violet-600 to-pink-600 px-5 py-8 text-center text-white"><span className="rounded-full border border-white/30 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest">Exclusive for travelers</span><h3 className="mt-4 text-2xl font-black leading-tight tracking-tight">{previewSubject}</h3><p className="mt-2 text-xs text-violet-100">A little more adventure for a little less.</p></div>
    <div className="px-5 pb-5"><div className="-mt-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-lg"><p className="text-[9px] font-extrabold uppercase tracking-widest text-violet-700">Just for you, {name}</p><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span></div></div>
  </div>;
}

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

      <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <label className="mb-3 block text-sm font-bold text-slate-800">Campaign type</label>
            <div className="grid gap-3 md:grid-cols-3">
              {campaignOptions.map((option) => {
                const Icon = option.icon;
                const active = campaignType === option.value;
                return <button key={option.value} type="button" onClick={() => setCampaignType(option.value)} className={`rounded-2xl border p-4 text-left transition ${active ? `${option.active} ring-2` : "border-slate-200 hover:border-slate-300"}`}>
                  <Icon className={`mb-3 h-5 w-5 ${active ? option.iconColor : "text-slate-400"}`} />
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
            <input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={150} required placeholder={campaignCopy[campaignType].subject} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
            <p className="mt-1 text-right text-xs text-slate-400">{subject.length}/150</p>
          </div>

          <div>
            <label htmlFor="message" className="mb-2 block text-sm font-bold text-slate-800">Message</label>
            <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required rows={9} placeholder={campaignCopy[campaignType].message} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 leading-relaxed outline-none focus:border-orange-400" />
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

        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-100 p-5 shadow-sm xl:sticky xl:top-8">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Live email preview</p><p className="mt-1 text-xs text-slate-400">Layout changes with campaign type</p></div>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold capitalize text-slate-600 shadow-sm">{campaignType}</span>
          </div>
          <CampaignPreview type={campaignType} subject={subject} message={message} ctaLabel={ctaLabel} recipientName={selectedUser?.name || ""} />
          <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-xs text-slate-300"><strong className="block text-white">{recipientLabel}</strong><span className="mt-1 block leading-relaxed">Sent as individual, responsive branded emails. Review all content before delivery.</span></div>
        </aside>
      </form>
    </div>
  );
}
