"use client";
import { useEffect, useState } from 'react';

type Report = { id: string; reason: string; status: string; created_at: string; reporter_name: string; traveler_name: string; trip_title: string };
export default function TravelerReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  async function refresh() {
    try { const response = await fetch('/api/admin/traveler-reports', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load reports.'); setReports(data.reports); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load reports.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function review(id: string) {
    setBusy(id);
    try { const response = await fetch('/api/admin/traveler-reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not update report.'); }
    finally { setBusy(null); }
  }
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Traveler reports</h1><p className="mt-2 text-sm text-slate-600">Private concerns from trip chats. Reports are allegations to review; no account penalty is applied automatically.</p></div><button onClick={() => void refresh()} className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button></div>{error && <p role="alert" className="mb-4 text-rose-700">{error}</p>}{loading ? <p role="status">Loading reports…</p> : reports.length === 0 ? <p>No traveler reports yet.</p> : <div className="space-y-4">{reports.map(report => <article key={report.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{report.traveler_name}</h2><span className="text-xs font-semibold uppercase text-slate-500">{report.status}</span></div><p className="mt-2 text-sm text-slate-600">Reported by {report.reporter_name} · {report.trip_title || 'Trip unavailable'}</p><p className="mt-1 text-xs text-slate-500">{new Date(report.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p><p className="my-4 whitespace-pre-wrap break-words text-sm leading-6">{report.reason}</p>{report.status === 'pending' && <button disabled={!!busy} onClick={() => void review(report.id)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === report.id ? 'Saving…' : 'Mark reviewed'}</button>}</article>)}</div>}</div>;
}
