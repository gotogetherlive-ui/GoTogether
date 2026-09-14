"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Loader2, Mail, MapPin, MessageCircle, Phone, QrCode, RefreshCw, ScanLine, Search, Sparkles, UserRound, UsersRound, X } from "lucide-react";

type CustomTripRequest = {
  id: string;
  user_id: string | null;
  booker_name: string;
  email: string | null;
  traveler_names: string[];
  phone: string;
  whatsapp_number: string | null;
  destination: string | null;
  alternate_destination: string | null;
  place_type: string | null;
  notes: string | null;
  status: "new" | "contacted" | "planning" | "confirmed" | "closed";
  admin_notes: string | null;
  trip_date: string | null;
  confirmed_at: string | null;
  ticket_number: string | null;
  qr_code_data: string | null;
  ticket_status: "valid" | "used" | "cancelled" | null;
  ticket_generated_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  account_email: string | null;
  account_name: string | null;
};

const statusStyle: Record<CustomTripRequest["status"], string> = {
  new: "bg-orange-100 text-orange-700",
  contacted: "bg-blue-100 text-blue-700",
  planning: "bg-violet-100 text-violet-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
};

const statuses: CustomTripRequest["status"][] = ["new", "contacted", "planning", "confirmed", "closed"];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function requestDestination(item: CustomTripRequest) {
  return item.destination || (item.place_type ? item.place_type.replace("_", " ") : "Not decided");
}

function requestReference(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default function AdminCustomTripsPage() {
  const [requests, setRequests] = useState<CustomTripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | CustomTripRequest["status"]>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomTripRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [finalDestination, setFinalDestination] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/custom-trips", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load custom trip requests.");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!term) return true;
      return [item.id, requestReference(item.id), item.ticket_number, item.booker_name, item.email, item.phone, item.whatsapp_number, item.destination, item.alternate_destination, item.place_type, ...item.traveler_names]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [requests, filter, search]);

  const openRequest = (item: CustomTripRequest) => {
    setSelected(item);
    setAdminNotes(item.admin_notes || "");
    setFinalDestination(item.destination || "");
    setTripDate(item.trip_date ? String(item.trip_date).slice(0, 10) : "");
  };

  const updateRequest = async (status = selected?.status) => {
    if (!selected || !status) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/custom-trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status, adminNotes, destination: finalDestination, tripDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");
      const updated = data.request as CustomTripRequest;
      setSelected(updated);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) {
      alert(updateError instanceof Error ? updateError.message : "Could not update this request.");
    } finally {
      setUpdating(false);
    }
  };

  const count = (status: CustomTripRequest["status"]) => requests.filter((item) => item.status === status).length;

  const checkInTicket = async () => {
    if (!selected || selected.ticket_status !== "valid") return;
    if (!window.confirm(`Confirm check-in for all ${selected.traveler_names.length} passengers? This records the current time on the live ticket.`)) return;
    setCheckingIn(true);
    try {
      const response = await fetch("/api/admin/custom-trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, checkIn: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Check-in failed");
      const updated = data.request as CustomTripRequest;
      setSelected(updated);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (checkInError) {
      alert(checkInError instanceof Error ? checkInError.message : "Could not check in these passengers.");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Concierge pipeline</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">Custom Trip Requests</h1><p className="mt-2 text-sm text-slate-500">Review traveler preferences, call the booker and move each plan forward.</p></div>
        <button onClick={loadRequests} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-2xl border bg-white p-4 text-left transition ${filter === status ? "border-orange-300 shadow-md ring-2 ring-orange-100" : "border-slate-100 hover:border-slate-200"}`}><p className="text-xs font-bold capitalize text-slate-500">{status}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{count(status)}</p></button>)}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name={'search-reference-ticket-name'} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Search reference, ticket, name, phone or destination" /></label>
        <button onClick={() => setFilter("all")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${filter === "all" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>All requests ({requests.length})</button>
      </div>

      {loading ? <div className="grid h-64 place-items-center"><Loader2 className="h-9 w-9 animate-spin text-orange-500" /></div> : error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div> : filtered.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center"><Sparkles className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-4 font-bold text-slate-700">No matching custom trip requests</p></div> : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Booker</th><th className="px-5 py-4">Travelers</th><th className="px-5 py-4">Trip request</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className="hover:bg-orange-50/30"><td className="px-5 py-4"><p className="font-bold text-slate-900">{item.booker_name}</p><p className="mt-1 font-mono text-[11px] font-bold text-orange-600">Ref #{requestReference(item.id)}</p>{item.email && <p className="mt-1 flex max-w-[220px] items-center gap-1 truncate text-xs text-slate-500"><Mail className="h-3 w-3 shrink-0" />{item.email}</p>}<p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{item.phone}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.traveler_names.length} people</p><p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">{item.traveler_names.join(", ")}</p></td><td className="px-5 py-4"><p className="font-bold capitalize text-slate-800">{requestDestination(item)}</p>{item.alternate_destination && <p className="mt-1 text-xs text-slate-500">Alternate: {item.alternate_destination}</p>}</td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(item.created_at)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyle[item.status]}`}>{item.status}</span></td><td className="px-5 py-4 text-right"><button onClick={() => openRequest(item)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">View details</button></td></tr>)}</tbody></table></div>
        </div>
      )}

      {selected && <><button aria-label="Close request details" onClick={() => setSelected(null)} className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm" /><aside className="fixed inset-y-0 right-0 z-[101] w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Custom trip consultation</p><h2 className="mt-1 text-xl font-semibold">{selected.booker_name}</h2></div><button onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X className="h-5 w-5" /></button></div>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3"><span className="text-xs font-semibold text-orange-800">Customer reference</span><span className="font-mono text-sm font-semibold tracking-wider text-orange-700">#{requestReference(selected.id)}</span></div>
          <div className="grid gap-3 sm:grid-cols-2"><a href={`tel:${selected.phone}`} className="rounded-2xl bg-slate-950 p-5 text-white hover:bg-orange-600"><Phone className="h-5 w-5 text-orange-300" /><p className="mt-4 text-xs text-slate-400">Call booker</p><p className="mt-1 font-semibold">{selected.phone}</p></a><div className="rounded-2xl bg-orange-50 p-5"><MapPin className="h-5 w-5 text-orange-600" /><p className="mt-4 text-xs text-orange-700">Preferred trip</p><p className="mt-1 font-semibold capitalize text-slate-900">{requestDestination(selected)}</p></div></div>
          {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 hover:bg-blue-100"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white"><Mail className="h-5 w-5" /></span><span><span className="block text-xs text-blue-700">Email contact</span><span className="font-bold">{selected.email}</span></span></a>}
          {selected.whatsapp_number && <a href={`https://wa.me/${selected.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 hover:bg-emerald-100"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"><MessageCircle className="h-5 w-5" /></span><span><span className="block text-xs text-emerald-700">WhatsApp contact</span><span className="font-semibold">{selected.whatsapp_number}</span></span></span><span className="text-xs font-bold">Open WhatsApp</span></a>}
          <section className="rounded-2xl border border-slate-200 p-5"><h3 className="flex items-center gap-2 font-semibold"><UsersRound className="h-5 w-5 text-blue-600" />Travelers ({selected.traveler_names.length})</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{selected.traveler_names.map((name, index) => <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{index + 1}</span>{name}</div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold">Trip preferences</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Destination</dt><dd className="font-bold text-right">{selected.destination || "Not fixed"}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Alternate</dt><dd className="font-bold text-right">{selected.alternate_destination || "—"}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Place type</dt><dd className="font-bold capitalize text-right">{selected.place_type?.replace("_", " ") || "—"}</dd></div></dl>{selected.notes && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{selected.notes}</div>}</section>
          <section className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
            <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-orange-600" />Final booking details</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Destination and travel date are required before confirming. Confirmation creates the QR ticket and emails it once.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Final destination<input name={'agreed-destination'} value={finalDestination} onChange={(event) => setFinalDestination(event.target.value)} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Agreed destination" /></label>
              <label className="text-xs font-bold text-slate-600">Travel date<input name={'date'} type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" /></label>
            </div>
          </section>
          {selected.ticket_number && selected.qr_code_data && <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Confirmed ticket</p><p className="mt-1 font-mono text-sm font-semibold text-emerald-950">{selected.ticket_number}</p></div><span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold capitalize text-white">{selected.ticket_status}</span></div>
            <div className="grid items-center gap-5 p-5 sm:grid-cols-[150px_1fr]">
              <Image src={selected.qr_code_data} alt={`QR code for ${selected.ticket_number}`} width={150} height={150} unoptimized className="aspect-square w-full rounded-xl bg-white p-2 shadow-sm" />
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-slate-950"><QrCode className="h-5 w-5 text-emerald-600" />Ready to scan</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">The customer received this QR by email. Scanning opens the live status and passenger list.</p>
                <div className="mt-4 flex flex-wrap gap-2"><a href={`/verify-ticket/${encodeURIComponent(selected.ticket_number)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Open ticket <ExternalLink className="h-3.5 w-3.5" /></a></div>
              </div>
            </div>
            <div className="border-t border-emerald-200 bg-white/70 p-5">
              {selected.ticket_status === "used" ? <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-950">Passengers checked in</p><p className="mt-1 text-xs text-emerald-700">{selected.checked_in_at ? `Recorded ${formatDate(selected.checked_in_at)}` : "Check-in recorded"}</p></div></div> : selected.ticket_status === "valid" ? <div>
                <button onClick={checkInTicket} disabled={checkingIn || !selected.trip_date || String(selected.trip_date).slice(0, 10) > todayInIndia()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">{checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}Check in all passengers</button>
                <p className="mt-2 text-center text-xs text-slate-500">{selected.trip_date && String(selected.trip_date).slice(0, 10) <= todayInIndia() ? "Admin confirmation records all listed passengers as checked in." : "Check-in becomes available when the travel date starts."}</p>
              </div> : <p className="text-sm font-bold text-rose-700">This cancelled ticket cannot be checked in.</p>}
            </div>
          </section>}
          {selected.account_email && <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><h3 className="flex items-center gap-2 font-semibold text-blue-900"><UserRound className="h-5 w-5" />Linked account</h3><p className="mt-2 text-sm text-blue-800">{selected.account_name} · {selected.account_email}</p></section>}
          <section className="rounded-2xl border border-slate-200 p-5"><label className="text-sm font-semibold">Internal admin notes<textarea name={'call-outcome-budget-range'} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={5} maxLength={4000} className="mt-3 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Call outcome, budget range, follow-up date..." /></label><div className="mt-4 grid grid-cols-2 gap-3"><select aria-label={'Status'} name={'status'} value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as CustomTripRequest["status"] })} className="rounded-xl border border-slate-200 px-3 text-sm font-bold capitalize outline-none focus:border-orange-400">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><button onClick={() => updateRequest()} disabled={updating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save update</button></div></section>
          <p className="flex items-center gap-2 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />Submitted {formatDate(selected.created_at)}</p>
        </div></aside></>}
    </div>
  );
}
