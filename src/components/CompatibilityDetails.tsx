"use client";

import { useEffect, useRef } from 'react';
import { ArrowRight, Check, Heart, MapPin, Sparkles, X } from 'lucide-react';
import type { BreakdownItem } from '@/lib/matchEngine';

type Props = {
  trip: {
    organizer_name: string; destination: string; title: string; match_score: number;
    match_breakdown?: BreakdownItem[]; common_activities?: string[]; common_languages?: string[];
    user_request_status: string | null; registration_closed: number; trip_date: string;
  };
  onClose: () => void;
  onRequest: () => void;
  onChat: () => void;
};

export default function CompatibilityDetails({ trip, onClose, onRequest, onChat }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);

  const score = Math.min(100, Math.max(0, trip.match_score));
  const past = trip.trip_date && new Date(trip.trip_date) < new Date(new Date().setHours(0, 0, 0, 0));
  const accepted = trip.user_request_status === 'accepted';
  const unavailable = !!past || !!trip.registration_closed || !!trip.user_request_status;
  const action = trip.user_request_status === 'removed' ? 'Removed by organizer' : accepted ? 'Open trip chat' : past ? 'Trip completed' : trip.registration_closed ? 'Registration closed' : trip.user_request_status === 'pending' ? 'Interest already shown' : trip.user_request_status === 'rejected' ? 'Request not accepted' : 'Show interest in this trip';

  return (
    <dialog ref={dialog} aria-labelledby="compatibility-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm">
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div><p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" />Your travel chemistry</p><h2 id="compatibility-title" className="text-xl font-bold tracking-tight sm:text-2xl">Compatibility details</h2><p className="mt-1 text-xs text-slate-500">You and {trip.organizer_name}</p></div>
          <button type="button" autoFocus aria-label="Close compatibility details" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"><X aria-hidden="true" className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain bg-slate-50/60 p-5 sm:p-7">
          <section aria-label="Overall compatibility" className="rounded-2xl bg-[#173c35] p-5 text-white sm:p-6">
            <div className="flex items-center gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center sm:h-28 sm:w-28">
                <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeOpacity=".15" strokeWidth="7" /><circle cx="60" cy="60" r="52" fill="none" stroke="#fdba74" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={`${score} 100`} /></svg>
                <div className="text-center"><p className="text-2xl font-bold sm:text-3xl">{score}%</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/70">Match</p></div>
              </div>
              <div><h3 className="font-serif text-xl leading-tight sm:text-2xl">{score >= 80 ? 'So much in common.' : score >= 50 ? 'Find your common ground.' : 'Different styles. New perspectives.'}</h3><p className="mt-2 text-xs leading-5 text-white/80">{score >= 80 ? 'Your travel preferences are closely aligned.' : score >= 50 ? 'You share several preferences. See where your styles align below.' : 'Your preferences differ in several areas. Compare what matters to you.'}</p></div>
            </div>
            <p className="mt-5 flex items-start gap-2 border-t border-white/15 pt-4 text-xs text-white/80"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-orange-200" /><span className="break-words">{trip.destination} · {trip.title}</span></p>
          </section>

          {((trip.common_activities?.length || 0) > 0 || (trip.common_languages?.length || 0) > 0) && <section><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Heart aria-hidden="true" className="h-4 w-4 text-orange-700" />What brings you together</h3><div className="space-y-3">{[{ label: 'Shared interests', values: trip.common_activities }, { label: 'Shared languages', values: trip.common_languages }].filter(group => group.values?.length).map(group => <div key={group.label}><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p><div className="flex flex-wrap gap-2">{group.values!.map(value => <span key={value} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"><Check aria-hidden="true" className="h-3 w-3" />{value}</span>)}</div></div>)}</div></section>}

          <section aria-labelledby="match-breakdown-title">
            <h3 id="match-breakdown-title" className="text-sm font-bold">Your preferences, side by side</h3><p className="mb-4 mt-1 text-xs leading-5 text-slate-500">Compare each part of your travel style.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {trip.match_breakdown?.map(item => <article key={item.dimension} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-2"><h4 className="text-xs font-bold text-slate-800">{item.label}</h4><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.score >= 70 ? 'bg-emerald-50 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>{item.score}%</span></div>
                <div aria-hidden="true" className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.score >= 70 ? 'bg-emerald-600' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} /></div>
                <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">You</dt><dd className="break-words capitalize leading-5 text-slate-800">{item.userAValue || 'Not set'}</dd></div><div className="border-l border-slate-100 pl-3"><dt className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Them</dt><dd className="break-words capitalize leading-5 text-slate-800">{item.userBValue || 'Not set'}</dd></div></dl>
              </article>)}
            </div>
            {!trip.match_breakdown?.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Detailed comparisons are not available for this match yet.</p>}
          </section>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7"><button type="button" disabled={!accepted && unavailable} onClick={accepted ? onChat : onRequest} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">{action}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button></footer>
      </div>
    </dialog>
  );
}
