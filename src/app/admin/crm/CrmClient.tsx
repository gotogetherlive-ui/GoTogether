"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign,
  Headphones, Inbox, Loader2, MessageCircle, RefreshCw, Search, Send,
  Sparkles, UserRound, Users, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = "overview" | "inbox" | "customers" | "bookings" | "whatsapp";
type Customer = { id: string; full_name: string; email: string; phone_number: string | null; role: string; avatar_url: string | null; created_at: string; stage: string; tags: string[]; next_follow_up_at: string | null; booking_count: number; paid_booking_count: number; lifetime_value: number; open_cases: number; last_activity_at: string };
type Booking = { id: string; booking_ref: string | null; booking_status: string; payment_status: string; amount: number; created_at: string; trip_date: string; user_id: string; customer_name: string; customer_email: string; trip_title: string; destination: string };
type Activity = { id: string; source: "support" | "feedback" | "custom_trip"; title: string; preview: string; status: string; contact_name: string; email: string | null; phone: string | null; created_at: string };
type Conversation = { id: string; contact_name: string | null; phone_number: string; status: string; unread_count: number; last_message_preview: string | null; last_message_at: string | null };
type Message = { id: string; direction: "inbound" | "outbound"; body: string | null; delivery_status: string; created_at: string };
type CustomerDetail = { customer: Customer; notes: Array<{ id: string; body: string; created_at: string; author_name: string }> };
type CrmData = { stats: { customers: number; paid_bookings: number; gross_revenue: number; open_cases: number; custom_trip_leads: number }; customers: Customer[]; bookings: Booking[]; inbox: Activity[]; conversations: Conversation[]; integrations: { whatsapp: { enabled: boolean; configured: boolean } } };

const tabs: Array<{ id: Tab; label: string; icon: typeof Inbox }> = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "customers", label: "Customers", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarClock },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

const stages = ["lead", "customer", "repeat", "vip", "churn_risk"];
const stageNames: Record<string, string> = { lead: "Lead", customer: "Customer", repeat: "Repeat", vip: "VIP", churn_risk: "Needs attention" };
const stageClass: Record<string, string> = { lead: "bg-sky-50 text-sky-700 ring-sky-200", customer: "bg-emerald-50 text-emerald-700 ring-emerald-200", repeat: "bg-violet-50 text-violet-700 ring-violet-200", vip: "bg-amber-50 text-amber-700 ring-amber-200", churn_risk: "bg-rose-50 text-rose-700 ring-rose-200" };

function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0) / 100); }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—"; }
function initials(name?: string | null) { return (name || "Guest").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function StageBadge({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${stageClass[value] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>{stageNames[value] || value}</span>; }

export default function CrmClient() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query = "") => {
    await Promise.resolve();
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/crm?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the CRM workspace");
      setData(await response.json());
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load CRM"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/crm", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the CRM workspace");
        return response.json() as Promise<CrmData>;
      })
      .then((nextData) => setData(nextData))
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Could not load CRM");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function openCustomer(id: string) {
    setCustomerId(id); setCustomerDetail(null);
    const response = await fetch(`/api/admin/crm/customers/${id}`, { cache: "no-store" });
    if (response.ok) setCustomerDetail(await response.json());
  }

  async function updateCustomer(payload: Record<string, unknown>) {
    if (!customerId) return;
    setSaving(true);
    const response = await fetch(`/api/admin/crm/customers/${customerId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) { await Promise.all([openCustomer(customerId), load(search)]); }
    else setError((await response.json()).error || "Could not update customer");
    setSaving(false);
  }

  async function openConversation(id: string) {
    setConversationId(id); setMessages([]);
    const response = await fetch(`/api/admin/crm/conversations/${id}`, { cache: "no-store" });
    if (response.ok) { const detail = await response.json(); setMessages(detail.messages); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault(); if (!conversationId || !reply.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/admin/crm/conversations/${conversationId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: reply }) });
    if (response.ok) { setReply(""); await Promise.all([openConversation(conversationId), load(search)]); }
    else setError((await response.json()).error || "Could not send message");
    setSaving(false);
  }

  const selectedConversation = useMemo(() => data?.conversations.find((item) => item.id === conversationId), [data, conversationId]);

  if (loading && !data) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 pb-12">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-200 sm:px-8 sm:py-9">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Customer operations</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">One place for every traveller.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Bookings, enquiries, customer history, support cases and WhatsApp conversations—connected to the data you already use.</p></div>
          <form onSubmit={(event) => { event.preventDefault(); void load(search); }} className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur">
            <Search className="ml-2 h-4 w-4 text-slate-400" /><input id="crm-search" name="crm-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, booking…" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-400" />
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-50">Search</button>
          </form>
        </div>
      </section>

      {error && <div role="alert" className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {([
          ["Customers", data?.stats.customers || 0, Users, "text-sky-600 bg-sky-50"],
          ["Paid bookings", data?.stats.paid_bookings || 0, CheckCircle2, "text-emerald-600 bg-emerald-50"],
          ["Gross revenue", money(data?.stats.gross_revenue || 0), CircleDollarSign, "text-amber-600 bg-amber-50"],
          ["Open cases", data?.stats.open_cases || 0, Headphones, "text-rose-600 bg-rose-50"],
          ["Custom leads", data?.stats.custom_trip_leads || 0, Sparkles, "text-violet-600 bg-violet-50"],
        ] satisfies Array<[string, string | number, LucideIcon, string]>).map(([label, value, Icon, tone]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div><p className="text-xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></article>)}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className="h-4 w-4" />{label}</button>)}<button onClick={() => void load(search)} className="ml-auto rounded-xl p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800" aria-label="Refresh CRM"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div></div>

      {(tab === "overview" || tab === "customers") && <CustomerPanel customers={(data?.customers || []).slice(0, tab === "overview" ? 8 : undefined)} onOpen={openCustomer} compact={tab === "overview"} />}
      {tab === "overview" && <div className="grid gap-6 lg:grid-cols-2"><InboxPanel activities={(data?.inbox || []).slice(0, 5)} compact /><BookingPanel bookings={(data?.bookings || []).slice(0, 5)} compact /></div>}
      {tab === "inbox" && <InboxPanel activities={data?.inbox || []} />}
      {tab === "bookings" && <BookingPanel bookings={data?.bookings || []} />}
      {tab === "whatsapp" && <WhatsAppPanel conversations={data?.conversations || []} configured={Boolean(data?.integrations.whatsapp.enabled && data?.integrations.whatsapp.configured)} selectedId={conversationId} selected={selectedConversation} messages={messages} reply={reply} saving={saving} onReply={setReply} onOpen={openConversation} onSend={sendReply} />}

      {customerId && <CustomerModal detail={customerDetail} saving={saving} onClose={() => { setCustomerId(null); setCustomerDetail(null); }} onUpdate={updateCustomer} />}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{children}</section>; }

function CustomerPanel({ customers, onOpen, compact = false }: { customers: Customer[]; onOpen: (id: string) => void; compact?: boolean }) { return <Panel title={compact ? "Customer pulse" : "Customer directory"} subtitle="Relationship stage, bookings, value and follow-up context."><div className="divide-y divide-slate-100">{customers.map((customer) => <button key={customer.id} onClick={() => onOpen(customer.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[auto_minmax(0,1.5fr)_minmax(90px,.7fr)_minmax(90px,.7fr)_auto] sm:px-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials(customer.full_name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900">{customer.full_name}</span><span className="block truncate text-xs text-slate-500">{customer.email}</span></span><span className="hidden sm:block"><StageBadge value={customer.stage} /></span><span className="hidden text-sm sm:block"><b className="text-slate-900">{money(customer.lifetime_value)}</b><small className="block text-slate-400">lifetime value</small></span><ChevronRight className="h-4 w-4 text-slate-300" /></button>)}{!customers.length && <Empty text="No customers match this view." />}</div></Panel>; }

function InboxPanel({ activities, compact = false }: { activities: Activity[]; compact?: boolean }) { const href: Record<Activity["source"], string> = { support: "/admin/support", feedback: "/admin/reports", custom_trip: "/admin/custom-trips" }; return <Panel title="Unified inbox" subtitle="Support, feedback and custom-trip enquiries in one queue."><div className="divide-y divide-slate-100">{activities.map((item) => <Link key={`${item.source}-${item.id}`} href={href[item.source]} className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-sm text-slate-900">{item.title}</b><small className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold uppercase text-slate-500">{item.source.replace("_", " ")}</small></span><span className="mt-1 block truncate text-xs text-slate-500">{item.contact_name} · {item.preview}</span></span><span className="hidden text-xs text-slate-400 sm:block">{date(item.created_at)}</span><ArrowUpRight className="h-4 w-4 text-slate-300" /></Link>)}{!activities.length && <Empty text="The inbox is clear." />}</div>{compact && <Link href="#" onClick={(event) => event.preventDefault()} className="hidden" />}</Panel>; }

function BookingPanel({ bookings, compact = false }: { bookings: Booking[]; compact?: boolean }) { return <Panel title={compact ? "Recent bookings" : "Booking pipeline"} subtitle="A live operational view of bookings and payments."><div className="divide-y divide-slate-100">{bookings.map((booking) => <div key={booking.id} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 sm:grid-cols-[1.3fr_1fr_auto]"><span className="min-w-0"><b className="block truncate text-sm text-slate-900">{booking.trip_title}</b><small className="block truncate text-slate-500">{booking.customer_name} · {booking.destination}</small></span><span className="hidden text-xs text-slate-500 sm:block"><b className="block text-sm text-slate-800">{booking.booking_ref || "Pending reference"}</b>{date(booking.trip_date)}</span><span className="text-right"><b className="block text-sm text-slate-900">{money(booking.amount)}</b><small className={`font-bold uppercase ${booking.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{booking.payment_status}</small></span></div>)}{!bookings.length && <Empty text="No bookings match this view." />}</div></Panel>; }

function WhatsAppPanel({ conversations, configured, selectedId, selected, messages, reply, saving, onReply, onOpen, onSend }: { conversations: Conversation[]; configured: boolean; selectedId: string | null; selected?: Conversation; messages: Message[]; reply: string; saving: boolean; onReply: (value: string) => void; onOpen: (id: string) => void; onSend: (event: React.FormEvent) => void }) { return <div className="space-y-4"><div className={`rounded-2xl border px-4 py-3 text-sm ${configured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{configured ? "WhatsApp Cloud API is connected. Signed webhook events appear here automatically." : "WhatsApp is safely disabled. Add verified Meta credentials and enable it only when the webhook is subscribed."}</div><div className="grid min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="px-5 py-4"><h2 className="font-bold text-slate-950">Conversations</h2></div><div className="max-h-72 divide-y divide-slate-100 overflow-y-auto lg:max-h-[470px]">{conversations.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} className={`flex w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 ${selectedId === item.id ? "bg-orange-50" : ""}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials(item.contact_name)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{item.contact_name || item.phone_number}</b><small className="block truncate text-slate-500">{item.last_message_preview || "New conversation"}</small></span>{item.unread_count > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{item.unread_count}</span>}</button>)}{!conversations.length && <Empty text="No WhatsApp conversations yet." />}</div></aside><div className="flex min-h-[420px] flex-col bg-slate-50">{selectedId ? <><header className="border-b border-slate-200 bg-white px-5 py-4"><b className="text-sm text-slate-900">{selected?.contact_name || selected?.phone_number || "Conversation"}</b><small className="block text-slate-500">{selected?.phone_number}</small></header><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.direction === "outbound" ? "rounded-br-md bg-slate-900 text-white" : "rounded-bl-md bg-white text-slate-800"}`}><p>{message.body || "Unsupported message"}</p><small className={`mt-1 block text-[10px] ${message.direction === "outbound" ? "text-slate-400" : "text-slate-400"}`}>{date(message.created_at)} · {message.delivery_status}</small></div></div>)}</div><form onSubmit={onSend} className="flex gap-2 border-t border-slate-200 bg-white p-4"><label htmlFor="whatsapp-reply" className="sr-only">WhatsApp reply</label><input id="whatsapp-reply" name="whatsapp-reply" value={reply} onChange={(event) => onReply(event.target.value)} disabled={!configured || saving} placeholder={configured ? "Write a reply…" : "Connect WhatsApp to reply"} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" /><button disabled={!configured || !reply.trim() || saving} className="rounded-xl bg-emerald-600 px-4 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send WhatsApp message">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form></> : <div className="m-auto max-w-xs px-6 text-center"><MessageCircle className="mx-auto mb-4 h-10 w-10 text-slate-300" /><h3 className="font-bold text-slate-800">Select a conversation</h3><p className="mt-2 text-sm text-slate-500">Customer messages and delivery status will appear here.</p></div>}</div></div></div>; }

function CustomerModal({ detail, saving, onClose, onUpdate }: { detail: CustomerDetail | null; saving: boolean; onClose: () => void; onUpdate: (payload: Record<string, unknown>) => void }) { const [note, setNote] = useState(""); return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Customer profile"><div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-500">Customer profile</p><h2 className="text-lg font-bold text-slate-950">{detail?.customer.full_name || "Loading…"}</h2></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Close customer profile"><X className="h-4 w-4" /></button></header>{detail ? <div className="space-y-6 p-5 sm:p-6"><div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-300 text-lg font-black text-slate-950">{initials(detail.customer.full_name)}</span><div className="min-w-0 flex-1"><h3 className="truncate text-xl font-bold">{detail.customer.full_name}</h3><p className="truncate text-sm text-slate-300">{detail.customer.email}</p><p className="text-sm text-slate-400">{detail.customer.phone_number || "No phone number"}</p></div><div className="text-left sm:text-right"><b className="block text-lg">{money(detail.customer.lifetime_value)}</b><small className="text-slate-400">lifetime value</small></div></div><div><label htmlFor="customer-stage" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Relationship stage</label><select id="customer-stage" name="customer-stage" value={detail.customer.stage || "lead"} onChange={(event) => void onUpdate({ stage: event.target.value })} disabled={saving} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-orange-400">{stages.map((stage) => <option key={stage} value={stage}>{stageNames[stage]}</option>)}</select></div><div className="grid grid-cols-3 gap-3">{[["Bookings", detail.customer.booking_count], ["Open cases", detail.customer.open_cases || 0], ["Joined", date(detail.customer.created_at)]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-3 text-center"><b className="block text-sm text-slate-900">{value}</b><small className="text-slate-500">{label}</small></div>)}</div><form onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; void onUpdate({ note }); setNote(""); }}><label htmlFor="crm-note" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Add internal note</label><textarea id="crm-note" name="crm-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={4000} placeholder="Record context for the next support interaction…" className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-400" /><button disabled={!note.trim() || saving} className="mt-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40">Save note</button></form><div><h3 className="mb-3 text-sm font-bold text-slate-900">Activity notes</h3><div className="space-y-3">{detail.notes.map((note) => <article key={note.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm leading-6 text-slate-700">{note.body}</p><small className="mt-2 block text-slate-400">{note.author_name} · {date(note.created_at)}</small></article>)}{!detail.notes.length && <p className="text-sm text-slate-400">No internal notes yet.</p>}</div></div></div> : <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>}</div></div>; }

function Empty({ text }: { text: string }) { return <div className="px-5 py-10 text-center"><UserRound className="mx-auto mb-2 h-6 w-6 text-slate-300" /><p className="text-sm text-slate-400">{text}</p></div>; }
