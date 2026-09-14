"use client";
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function TravelerModerationDialog({ tripId, traveler, action, onClose, onSuccess }: {
  tripId: string; traveler: { id: string; full_name: string }; action: 'remove' | 'report';
  onClose: () => void; onSuccess: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/chat/${tripId}/members/${traveler.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not complete this action.');
      onSuccess(data.message);
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="moderation-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/60">
    <div className="flex items-start justify-between gap-4"><h2 id="moderation-title" className="text-xl font-bold">{action === 'remove' ? 'Remove from trip?' : 'Report traveler'}</h2><button type="button" disabled={busy} aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
    <p className="mt-3 text-sm leading-6 text-slate-600">{action === 'remove' ? `${traveler.full_name} will lose access to this trip’s chat. Their card will show “Removed by organizer”. They cannot send another join request.` : `Share your concern about ${traveler.full_name}. Only the admin team can see this report. Reporting does not automatically remove or penalize anyone.`}</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-semibold">{action === 'remove' ? 'Reason (optional, visible to the traveler)' : 'What happened?'}<textarea value={reason} onChange={event => setReason(event.target.value)} required={action === 'report'} minLength={action === 'report' ? 10 : undefined} maxLength={2000} rows={4} className="premium-input mt-2" placeholder={action === 'remove' ? 'For example: our travel preferences do not align.' : 'Describe the concern and any relevant details from the trip chat.'} /></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : action === 'remove' ? 'Confirm removal' : 'Send report'}</button></div>
    </form>
  </dialog>;
}
