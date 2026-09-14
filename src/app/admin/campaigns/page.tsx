"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlignLeft, Bell, GalleryHorizontalEnd, Gift, Loader2, Mail, MapPinned, MessageSquareText, Mountain, MoonStar, Newspaper, Palette, Send, Stamp, Star, SunMedium, UserRound, Users, Waves } from "lucide-react";

type CampaignType = "retention" | "notification" | "offer" | "feedback";
type CampaignTheme = "signature" | "himalayan" | "coastal" | "midnight" | "postcard";
type CampaignLayout = "classic" | "panorama" | "editorial" | "journey" | "minimal";
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
  { value: "feedback" as const, label: "Feedback & rating", description: "Collect written feedback and an experience rating", icon: MessageSquareText, active: "border-amber-400 bg-amber-50 ring-amber-100", iconColor: "text-amber-700" },
];

const campaignCopy = {
  retention: { subject: "Your next adventure is waiting", message: "Remind travelers what they can discover and give them a warm reason to return.", cta: "Explore trips" },
  notification: { subject: "An important GoTogether update", message: "State what changed, why it matters, and whether the traveler needs to take action.", cta: "Review update" },
  offer: { subject: "A special travel offer for you", message: "Describe the benefit clearly, including important eligibility or booking conditions.", cta: "View offer" },
  feedback: { subject: "How was your GoTogether experience?", message: "Tell us what worked well, what we could improve, and rate your experience. Your response helps fellow travellers and shapes better journeys.", cta: "Share feedback & rating" },
};

const themeOptions = [
  { value: "signature" as const, label: "Signature", description: "Adapts to the campaign purpose", icon: SunMedium, swatches: ["bg-orange-500", "bg-blue-600", "bg-violet-600"] },
  { value: "himalayan" as const, label: "Himalayan Dawn", description: "Forest green, parchment and gold", icon: Mountain, swatches: ["bg-[#17352b]", "bg-[#d9a441]", "bg-[#f3ead5]"] },
  { value: "coastal" as const, label: "Coastal Breeze", description: "Fresh ocean blue and sea glass", icon: Waves, swatches: ["bg-sky-800", "bg-cyan-400", "bg-cyan-50"] },
  { value: "midnight" as const, label: "Midnight Luxe", description: "Deep navy with a warm gold accent", icon: MoonStar, swatches: ["bg-[#090f1f]", "bg-[#e7b85c]", "bg-[#18233b]"] },
  { value: "postcard" as const, label: "Travel Postcard", description: "Editorial, warm and personal", icon: Stamp, swatches: ["bg-stone-800", "bg-orange-700", "bg-[#f1e7d6]"] },
];

const layoutOptions = [
  { value: "classic" as const, label: "Classic Card", description: "Familiar, balanced campaign card", icon: Mail },
  { value: "panorama" as const, label: "Panorama", description: "Immersive headline and elevated content", icon: GalleryHorizontalEnd },
  { value: "editorial" as const, label: "Travel Journal", description: "Premium magazine-inspired storytelling", icon: Newspaper },
  { value: "journey" as const, label: "Journey Path", description: "Structured update with a visual route", icon: MapPinned },
  { value: "minimal" as const, label: "Personal Note", description: "Quiet, spacious and conversational", icon: AlignLeft },
];

const themePreview = {
  himalayan: { shell: "border-[#dfd1b6] bg-[#fffdf7] shadow-emerald-950/15", header: "bg-[#17352b]", headerText: "text-[#f4d99c]", hero: "bg-[#fffdf7]", eyebrow: "text-[#b7791f]", title: "font-serif text-[#17352b]", body: "bg-[#f3ead5] text-slate-700", button: "bg-[#b7791f] text-white", note: "Travel thoughtfully. Book confidently." },
  coastal: { shell: "border-cyan-100 bg-white shadow-cyan-950/15", header: "bg-sky-800", headerText: "text-cyan-100", hero: "bg-gradient-to-br from-cyan-50 to-sky-100", eyebrow: "text-sky-600", title: "font-serif text-cyan-950", body: "bg-cyan-50 text-slate-700", button: "bg-sky-600 text-white", note: "Fresh plans. Clear skies. Good company." },
  midnight: { shell: "border-slate-700 bg-[#111a2e] shadow-slate-950/30", header: "bg-[#0b1222]", headerText: "text-[#e7b85c]", hero: "bg-[#111a2e]", eyebrow: "text-[#e7b85c]", title: "font-serif text-[#fff7df]", body: "bg-[#18233b] text-slate-200", button: "bg-[#c9922f] text-white", note: "An elevated travel note, prepared for you." },
  postcard: { shell: "rounded-lg border-[#dacbb5] bg-[#fffaf0] shadow-stone-900/15", header: "bg-[#fffaf0]", headerText: "text-orange-700", hero: "bg-[#fffaf0]", eyebrow: "text-orange-700", title: "font-serif text-stone-800", body: "bg-[#f1e7d6] text-stone-700", button: "bg-stone-800 text-white", note: "A personal note for your next chapter." },
};

function PreviewBrand({ dark = false }: { dark?: boolean }) {
  return <span className="flex items-center gap-2.5"><Image src="/icon.svg" alt="" width={30} height={30} className="rounded-lg" /><strong className={dark ? "text-white" : "text-slate-950"}>GoTogether</strong></span>;
}

function layoutPalette(theme: CampaignTheme, type: CampaignType) {
  if (theme === "himalayan") return { canvas: "#f5f2e9", card: "#fffdf7", primary: "#17352b", accent: "#d9a441", panel: "#f3ead5", title: "#17352b" };
  if (theme === "coastal") return { canvas: "#eff8fa", card: "#ffffff", primary: "#075985", accent: "#22b8cf", panel: "#e6f7fa", title: "#083344" };
  if (theme === "midnight") return { canvas: "#090f1f", card: "#111a2e", primary: "#0b1222", accent: "#e7b85c", panel: "#18233b", title: "#fff7df" };
  if (theme === "postcard") return { canvas: "#f4efe6", card: "#fffaf0", primary: "#292524", accent: "#c2410c", panel: "#f1e7d6", title: "#292524" };
  if (type === "notification") return { canvas: "#eef4ff", card: "#ffffff", primary: "#172554", accent: "#2563eb", panel: "#eff6ff", title: "#0f172a" };
  if (type === "offer") return { canvas: "#f5f3ff", card: "#ffffff", primary: "#24124d", accent: "#db2777", panel: "#faf5ff", title: "#2e1065" };
  if (type === "feedback") return { canvas: "#fffbeb", card: "#ffffff", primary: "#78350f", accent: "#d97706", panel: "#fef3c7", title: "#451a03" };
  return { canvas: "#fff7ed", card: "#ffffff", primary: "#431407", accent: "#ea580c", panel: "#ffedd5", title: "#431407" };
}

function ModernLayoutPreview({ layout, theme, type, subject, message, ctaLabel, name }: { layout: Exclude<CampaignLayout, "classic">; theme: CampaignTheme; type: CampaignType; subject: string; message: string; ctaLabel: string; name: string }) {
  const colors = layoutPalette(theme, type);
  const dark = theme === "midnight";
  const bodyColor = dark ? "#dbe4f0" : "#475569";
  const label = type === "feedback" ? "Feedback & rating" : type;

  if (layout === "panorama") return <div className="overflow-hidden rounded-[26px] shadow-2xl" style={{ background: colors.card }}><div className="px-5 py-4" style={{ background: colors.primary }}><PreviewBrand dark /><span className="float-right -mt-6 text-[9px] font-bold uppercase tracking-[.18em]" style={{ color: colors.accent }}>Panorama</span></div><div className="px-6 py-10 text-center" style={{ background: colors.primary }}><p className="text-[9px] font-bold uppercase tracking-[.18em]" style={{ color: colors.accent }}>{label} · Curated for {name}</p><h3 className="mx-auto mt-4 font-serif text-3xl font-semibold leading-tight text-white">{subject}</h3></div><div className="mx-5 -mt-5 rounded-2xl p-5 shadow-lg" style={{ background: colors.panel, color: bodyColor }}><p className="text-xs leading-6">{message}</p><span className="mt-5 inline-block rounded-xl px-4 py-2.5 text-xs font-bold text-white" style={{ background: colors.accent }}>{ctaLabel}</span></div><div className="h-5" /></div>;

  if (layout === "editorial") return <div className="overflow-hidden border border-stone-200 shadow-xl" style={{ background: colors.card }}><div className="border-b border-black/10 px-5 py-4"><PreviewBrand /><span className="float-right -mt-6 font-serif text-[10px] italic text-slate-500">The GoTogether Journal</span></div><div className="grid grid-cols-[72px_1fr] gap-4 px-6 py-8"><p className="text-[9px] font-bold uppercase tracking-[.15em]" style={{ color: colors.accent }}>Edition 01<br />{label}</p><div><h3 className="font-serif text-3xl font-semibold leading-tight" style={{ color: colors.title }}>{subject}</h3><p className="mt-3 text-xs text-slate-500">A personal note for {name}</p></div></div><div className="mx-6 mb-6 border-l-[3px] pl-4 text-xs leading-6" style={{ borderColor: colors.accent, color: bodyColor }}>{message}<br /><span className="mt-4 inline-block rounded-lg px-4 py-2 font-bold text-white" style={{ background: colors.accent }}>{ctaLabel}</span></div></div>;

  if (layout === "journey") return <div className="overflow-hidden rounded-[22px] border border-slate-200 shadow-xl" style={{ background: colors.card }}><div className="px-5 py-4"><PreviewBrand dark={dark} /></div><div className="px-6 py-7" style={{ background: colors.panel }}><p className="text-[9px] font-bold uppercase tracking-[.16em]" style={{ color: colors.accent }}>Your journey update</p><h3 className="mt-3 text-3xl font-semibold leading-tight" style={{ color: colors.title }}>{subject}</h3></div><div className="flex gap-4 px-6 py-7"><div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full" style={{ background: colors.accent }} /><span className="h-24 w-0.5" style={{ background: colors.panel }} /></div><div><b className="text-xs" style={{ color: colors.title }}>A note for {name}</b><p className="mt-3 text-xs leading-6" style={{ color: bodyColor }}>{message}</p><span className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: colors.accent }}>{ctaLabel}</span></div></div></div>;

  return <div className="overflow-hidden rounded-2xl shadow-xl" style={{ background: colors.card }}><div className="px-7 pt-7"><PreviewBrand dark={dark} /></div><div className="px-7 pb-10 pt-10"><p className="text-[9px] font-bold uppercase tracking-[.18em]" style={{ color: colors.accent }}>{label}</p><h3 className="mt-5 text-3xl font-semibold leading-tight" style={{ color: colors.title }}>{subject}</h3><p className="mt-6 text-xs font-bold" style={{ color: colors.title }}>Hello {name},</p><p className="mt-3 text-xs leading-6" style={{ color: bodyColor }}>{message}</p><span className="mt-5 inline-block rounded-lg px-4 py-2.5 text-xs font-bold text-white" style={{ background: colors.accent }}>{ctaLabel}</span><p className="mt-8 font-serif text-xs italic text-slate-500">Until the next journey,<br /><b className="not-italic" style={{ color: colors.title }}>Team GoTogether</b></p></div></div>;
}

function CampaignPreview({ type, theme, layout, subject, message, ctaLabel, recipientName }: {
  type: CampaignType; theme: CampaignTheme; layout: CampaignLayout; subject: string; message: string; ctaLabel: string; recipientName: string;
}) {
  const copy = campaignCopy[type];
  const previewSubject = subject || copy.subject;
  const previewMessage = message || copy.message;
  const previewButton = ctaLabel || copy.cta;
  const name = recipientName || "Traveler";

  if (layout !== "classic") return <ModernLayoutPreview layout={layout} theme={theme} type={type} subject={previewSubject} message={previewMessage} ctaLabel={previewButton} name={name} />;

  if (theme !== "signature") {
    const style = themePreview[theme];
    const label = themeOptions.find((item) => item.value === theme)?.label || "GoTogether";
    return <div className={`overflow-hidden rounded-[24px] border shadow-xl ${style.shell}`}>
      <div className={`flex items-center justify-between px-5 py-4 ${style.header}`}><PreviewBrand dark={theme === "midnight" || theme === "himalayan"} /><span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${style.headerText}`}>{label}</span></div>
      <div className={`px-6 py-8 ${style.hero}`}><div className={`mb-5 w-10 border-t-[3px] ${theme === "midnight" ? "border-[#e7b85c]" : "border-current"} ${style.eyebrow}`} /><p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${style.eyebrow}`}>{type} · GoTogether</p><h3 className={`mt-3 text-3xl font-semibold leading-tight tracking-tight ${style.title}`}>{previewSubject}</h3><p className={`mt-3 text-xs ${theme === "midnight" ? "text-slate-400" : "text-slate-500"}`}>Hello {name},</p></div>
      <div className={`mx-5 rounded-2xl p-5 text-xs leading-6 ${style.body}`}><p className="whitespace-pre-wrap">{previewMessage}</p></div>
      <div className="px-5 pb-5"><span className={`mt-5 inline-block rounded-xl px-4 py-2.5 text-xs font-bold ${style.button}`}>{previewButton}</span><p className={`mt-5 border-t pt-4 text-[10px] ${theme === "midnight" ? "border-slate-700 text-slate-400" : "border-black/10 text-slate-500"}`}>{style.note}</p></div>
    </div>;
  }

  if (type === "retention") return <div className="overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-xl shadow-orange-950/10">
    <div className="flex items-center justify-between px-5 py-4"><PreviewBrand /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-700">Your next chapter</span></div>
    <div className="bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 px-5 py-8"><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-orange-700">Welcome back</span><h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-orange-950">{previewSubject}</h3><p className="mt-2 text-xs text-orange-800">Hi {name}, the road is better with good company.</p></div>
    <div className="p-5"><p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span><div className="mt-5 rounded-xl bg-orange-50 p-3 text-[10px] leading-4 text-orange-900"><strong className="block">Pick up where you left off</strong>Turn a saved idea into a real plan.</div></div>
  </div>;

  if (type === "notification") return <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><PreviewBrand /><span className="text-[10px] text-slate-500">Account update</span></div>
    <div className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-semibold text-blue-600">i</div><p className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-600">Important notification</p><h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-slate-950">{previewSubject}</h3><p className="mt-5 text-xs text-slate-600">Hello {name},</p><p className="mt-3 whitespace-pre-wrap border-l-[3px] border-blue-600 pl-4 text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span><p className="mt-5 border-t border-slate-100 pt-4 text-[10px] leading-4 text-slate-400">Official service message from GoTogether.</p></div>
  </div>;

  if (type === "feedback") {
    return <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-white shadow-xl shadow-amber-950/10">
      <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4"><PreviewBrand /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700">Feedback & rating</span></div>
      <div className="px-6 py-8 text-center"><div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><MessageSquareText className="h-6 w-6" /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white"><Star className="h-3 w-3 fill-current" /></span></div><p className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700">Your voice shapes GoTogether</p><h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-slate-950">{previewSubject}</h3><p className="mt-3 text-xs text-slate-500">Hi {name}, your experience matters to us.</p></div>
      <div className="mx-5 rounded-2xl bg-amber-50 p-5 text-xs leading-6 text-slate-700"><p className="whitespace-pre-wrap">{previewMessage}</p></div>
      <div className="px-5 pb-5 text-center"><span className="mt-5 inline-block rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span><p className="mt-5 border-t border-slate-100 pt-4 text-[10px] text-slate-400">A quick rating and thoughtful feedback help us improve every journey.</p></div>
    </div>;
  }

  return <div className="overflow-hidden rounded-[24px] bg-white shadow-2xl shadow-violet-950/20">
    <div className="flex items-center justify-between bg-[#24124d] px-5 py-4"><PreviewBrand dark /><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200">Member offer</span></div>
    <div className="bg-gradient-to-br from-violet-800 via-violet-600 to-pink-600 px-5 py-8 text-center text-white"><span className="rounded-full border border-white/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest">Exclusive for travelers</span><h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight">{previewSubject}</h3><p className="mt-2 text-xs text-violet-100">A little more adventure for a little less.</p></div>
    <div className="px-5 pb-5"><div className="-mt-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-lg"><p className="text-[9px] font-bold uppercase tracking-widest text-violet-700">Just for you, {name}</p><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{previewMessage}</p><span className="mt-5 inline-block rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold text-white">{previewButton}</span></div></div>
  </div>;
}

export default function AdminCampaignsPage() {
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [campaignType, setCampaignType] = useState<CampaignType>("retention");
  const [theme, setTheme] = useState<CampaignTheme>("signature");
  const [layout, setLayout] = useState<CampaignLayout>("classic");
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
        body: JSON.stringify({ campaignType, theme, layout, audience, targetUserId, subject, message, ctaLabel, ctaUrl, confirmAll }),
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
            <h1 className="text-3xl font-bold text-slate-900">User Campaigns</h1>
            <p className="mt-1 text-slate-500">Create retention, notification, offer, or combined feedback-and-rating emails for one user or your full user base.</p>
          </div>

        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <label className="mb-3 block text-sm font-bold text-slate-800">Campaign type</label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="mb-3 flex items-center gap-2"><Palette className="h-4 w-4 text-slate-500" /><label className="text-sm font-bold text-slate-800">Email theme</label></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return <button key={option.value} type="button" aria-pressed={active} onClick={() => setTheme(option.value)} className={`group rounded-2xl border p-4 text-left transition duration-200 ${active ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-100 shadow-sm" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"}`}>
                  <div className="mb-4 flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white"}`}><Icon className="h-4 w-4" /></span><span className="flex overflow-hidden rounded-full border border-white shadow-sm" aria-hidden="true">{option.swatches.map((swatch) => <i key={swatch} className={`h-4 w-4 ${swatch}`} />)}</span></div>
                  <strong className="block text-sm text-slate-900">{option.label}</strong><small className="mt-1 block leading-5 text-slate-500">{option.description}</small>
                </button>;
              })}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-slate-800">Email layout</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {layoutOptions.map((option) => {
                const Icon = option.icon;
                const active = layout === option.value;
                return <button key={option.value} type="button" aria-pressed={active} onClick={() => setLayout(option.value)} className={`rounded-2xl border p-3 text-left transition duration-200 ${active ? "border-slate-900 bg-slate-900 text-white shadow-lg" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"}`}><Icon className={`mb-3 h-5 w-5 ${active ? "text-amber-400" : "text-slate-400"}`} /><strong className="block text-xs">{option.label}</strong><small className={`mt-1 block text-[10px] leading-4 ${active ? "text-slate-300" : "text-slate-500"}`}>{option.description}</small></button>;
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
              <input name="confirm-all-recipients" type="checkbox" checked={confirmAll} onChange={(event) => setConfirmAll(event.target.checked)} className="mt-1" />
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
            <div><label htmlFor="ctaLabel" className="mb-2 block text-sm font-bold text-slate-800">Button text <span className="font-normal text-slate-400">(optional)</span></label><input id="ctaLabel" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} maxLength={50} placeholder={campaignCopy[campaignType].cta} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" /></div>
            <div><label htmlFor="ctaUrl" className="mb-2 block text-sm font-bold text-slate-800">Button URL <span className="font-normal text-slate-400">(optional)</span></label><input id="ctaUrl" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} maxLength={500} placeholder="/trips or https://…" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" /></div>
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}

          <button type="submit" disabled={sending || loadingUsers || (audience === "specific" && !targetUserId) || (audience === "all" && !confirmAll)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{sending ? "Sending campaign…" : "Send Campaign"}
          </button>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-slate-100 p-5 shadow-sm xl:sticky xl:top-8">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live email preview</p><p className="mt-1 text-xs text-slate-400">Theme and structure update instantly</p></div>
            <div className="flex flex-wrap justify-end gap-1"><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-slate-600 shadow-sm">{themeOptions.find((item) => item.value === theme)?.label}</span><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold text-white shadow-sm">{layoutOptions.find((item) => item.value === layout)?.label}</span></div>
          </div>
          <CampaignPreview type={campaignType} theme={theme} layout={layout} subject={subject} message={message} ctaLabel={ctaLabel} recipientName={selectedUser?.name || ""} />
          <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-xs text-slate-300"><strong className="block text-white">{recipientLabel}</strong><span className="mt-1 block leading-relaxed">Sent as individual, responsive branded emails. Review all content before delivery.</span></div>
        </aside>
      </form>
    </div>
  );
}
