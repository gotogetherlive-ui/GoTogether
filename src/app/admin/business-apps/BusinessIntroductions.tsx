"use client";

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { BusinessIntroduction } from '@/lib/businessIntroduction';

type Introduction = BusinessIntroduction & { user_email: string };

export default function BusinessIntroductions() {
  const [items, setItems] = useState<Introduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/business-introductions', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load introductions.');
      setItems(data.introductions);
      setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load introductions.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Populate the review list after its asynchronous request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function review(id: string, action: 'approve' | 'reject') {
    setProcessing(id);
    setError('');
    try {
      const response = await fetch('/api/admin/business-introductions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note: notes[id] || '' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save this decision.');
      setItems(previous => previous.map(item => item.id === id ? { ...item, status: data.status, review_note: notes[id] || null } : item));
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save this decision.'); }
    finally { setProcessing(null); }
  }

  const pending = items.filter(item => item.status === 'pending');
  const reviewed = items.filter(item => item.status !== 'pending');

  return <section aria-labelledby="business-introductions-heading" className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="business-introductions-heading" className="text-xl font-bold text-slate-900">Business introductions <span className="ml-2 rounded-full bg-orange-100 px-2.5 py-1 text-sm text-orange-800">{pending.length} pending</span></h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review these initial details before allowing users to access full registration. Allowing a user to proceed does not approve their final business account.</p></div><button type="button" onClick={() => void refresh()} disabled={!!processing} className="flex items-center gap-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh introductions</button></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading introductions…</p> : <>
      {pending.length === 0 && <p className="mt-6 text-sm text-slate-600">No introductions are awaiting review.</p>}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">{pending.map(item => <article key={item.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="break-words text-lg font-bold">{item.travel_name}</h3><p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.created_at).toLocaleString()}</p>
        <dl className="mt-5 space-y-3 text-sm"><div><dt className="font-semibold text-slate-500">Applicant</dt><dd className="break-words">{item.full_name}</dd></div><div><dt className="font-semibold text-slate-500">Account email</dt><dd className="break-words">{item.user_email}</dd></div><div><dt className="font-semibold text-slate-500">Phone number</dt><dd>{item.phone_number}</dd></div><div><dt className="font-semibold text-slate-500">Company address</dt><dd className="whitespace-pre-wrap break-words">{item.company_address || 'Not provided'}</dd></div></dl>
        <label htmlFor={`review-${item.id}`} className="mb-2 mt-5 block text-sm font-semibold">Note to applicant (optional)</label><textarea id={`review-${item.id}`} rows={2} maxLength={1000} value={notes[item.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [item.id]: event.target.value }))} className="premium-input" placeholder="Add feedback or explain your decision" />
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={!!processing} onClick={() => void review(item.id, 'approve')} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{processing === item.id ? 'Saving…' : 'Allow to proceed'}</button><button type="button" disabled={!!processing} onClick={() => void review(item.id, 'reject')} className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">Decline request</button></div>
      </article>)}</div>
      {reviewed.length > 0 && <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Reviewed introductions ({reviewed.length})</summary><div className="mt-3 space-y-3">{reviewed.map(item => <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><p className="break-words font-semibold">{item.travel_name} · {item.full_name}</p><span className={item.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}>{item.status === 'approved' ? 'Allowed to proceed' : 'Declined'}</span></div><p className="mt-2 break-words text-slate-600">{item.phone_number} · {item.user_email}</p><p className="mt-2 whitespace-pre-wrap break-words text-slate-600">{item.company_address || 'No company address provided'}</p>{item.review_note && <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">Note: {item.review_note}</p>}</div>)}</div></details>}
    </>}
  </section>;
}
