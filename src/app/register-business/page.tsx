"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle, Clock3, Loader2, ArrowRight } from 'lucide-react';
import BusinessRegistrationForm from './BusinessRegistrationForm';
import RegistrationProgress from './RegistrationProgress';
import type { BusinessIntroduction } from '@/lib/businessIntroduction';

export default function RegisterBusinessPage() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const manualCheck = useRef(false);
  const latestRequest = useRef(0);
  const [canProceed, setCanProceed] = useState(false);
  const [introduction, setIntroduction] = useState<BusinessIntroduction | null>(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', travelName: '', companyAddress: '' });

  const checkStatus = useCallback(async (signal?: AbortSignal, manual = false) => {
    if (manualCheck.current) return;
    const requestId = ++latestRequest.current;
    if (manual) {
      manualCheck.current = true;
      setChecking(true);
      setStatusMessage('');
      setError('');
    }
    const timeout = AbortSignal.timeout(15000);
    try {
      const response = await fetch('/api/business/introduction', {
        cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      const data = await response.json();
      if (signal?.aborted || requestId !== latestRequest.current) return;
      if (response.status === 401) { setSignedOut(true); setCanProceed(false); return; }
      if (!response.ok) throw new Error(data.error || 'Could not check your application.');
      setSignedOut(false);
      setIntroduction(data.introduction);
      setCanProceed(data.canProceed === true);
      setLoaded(true);
      setError('');
      if (manual) {
        const message = data.canProceed ? 'Approved. Opening your registration form?'
          : data.introduction?.status === 'pending' ? 'Status checked: your request is still awaiting admin approval.'
          : data.introduction?.status === 'rejected' ? 'Status checked: your request was not approved. Please contact support for help.'
          : 'No business introduction has been submitted yet.';
        setStatusMessage(message);
      }
    } catch (error) {
      if (signal?.aborted || requestId !== latestRequest.current) return;
      setError(timeout.aborted ? 'The status check timed out. Please try again.' : error instanceof Error ? error.message : 'Could not check your application.');
    } finally {
      if (manual) { manualCheck.current = false; setChecking(false); }
      if (!signal?.aborted && requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Status updates are produced by the asynchronous fetch, not derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkStatus(controller.signal);
    return () => controller.abort();
  }, [checkStatus]);

  useEffect(() => {
    if (introduction?.status !== 'pending' || canProceed || signedOut) return;
    const controller = new AbortController();
    const refresh = () => { if (document.visibilityState === 'visible') void checkStatus(controller.signal); };
    const interval = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [introduction?.status, canProceed, signedOut, checkStatus]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/business/introduction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (response.status === 401) { setSignedOut(true); return; }
      if (response.status === 409) { await checkStatus(); return; }
      if (!response.ok) throw new Error(data.error || 'Could not submit your details.');
      setIntroduction(data.introduction);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not submit your details.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center" role="status"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /><span className="sr-only">Loading your application</span></div>;
  if (canProceed) return <BusinessRegistrationForm introduction={introduction} />;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-orange-700">← Back to GoTogether</Link>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"><Building2 aria-hidden="true" className="h-7 w-7" /></div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">Become a GoTogether organizer</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Let’s get to know your business.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">First, share a few details with our team. Once an admin verifies and approves your request, your full business registration form will open automatically.</p>
          <RegistrationProgress status={introduction?.status || 'none'} />
          {error && <div role="alert" className="mb-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" disabled={checking} onClick={() => void checkStatus(undefined, true)} className="ml-3 underline disabled:opacity-50">{checking ? 'Checking?' : 'Try again'}</button></div>}
          {statusMessage && <p role="status" aria-live="polite" className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700">{statusMessage}</p>}
          {signedOut ? <Link href="/login?next=/register-business" className="gt-button">Sign in to continue <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : !loaded ? <p className="text-sm text-slate-600">Your application status must load before you can continue.</p> : introduction ? (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              {introduction.status === 'pending' ? <Clock3 aria-hidden="true" className="mb-3 h-7 w-7 text-orange-700" /> : <CheckCircle aria-hidden="true" className="mb-3 h-7 w-7 text-slate-500" />}
              <h2 className="text-xl font-bold">{introduction.status === 'pending' ? 'Your introduction is awaiting review' : 'Your request was not approved'}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{introduction.status === 'pending' ? 'Your details have been sent to our admin team. You can keep this page open or return later. The next step unlocks automatically after approval.' : 'Please contact our team if you have questions about this decision.'}</p>
              <dl className="mt-5 space-y-2 text-sm"><div><dt className="inline font-semibold">Name: </dt><dd className="inline break-words">{introduction.full_name}</dd></div><div><dt className="inline font-semibold">Travel business: </dt><dd className="inline break-words">{introduction.travel_name}</dd></div><div><dt className="inline font-semibold">Phone: </dt><dd className="inline">{introduction.phone_number}</dd></div></dl>
              {introduction.review_note && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-700"><strong>Admin note: </strong>{introduction.review_note}</p>}
              <div className="mt-6 flex flex-wrap gap-5"><button type="button" disabled={checking} aria-busy={checking} onClick={() => void checkStatus(undefined, true)} className="gt-text-link disabled:cursor-wait disabled:opacity-60">{checking && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{checking ? 'Checking?' : 'Check status'}</button><Link href="/contact" className="gt-text-link">Contact support</Link></div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div><label htmlFor="intro-name" className="mb-2 block text-sm font-semibold">Your full name <span className="text-orange-700">*</span></label><input id="intro-name" autoComplete="name" required minLength={2} maxLength={120} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="premium-input" placeholder="Enter your full name" /></div>
              <div><label htmlFor="intro-phone" className="mb-2 block text-sm font-semibold">Phone number <span className="text-orange-700">*</span></label><input id="intro-phone" type="tel" autoComplete="tel" required maxLength={30} value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} className="premium-input" placeholder="e.g. +91 98765 43210" /><p className="mt-2 text-xs text-slate-500">Include your country code so our team can reach you.</p></div>
              <div><label htmlFor="intro-travel" className="mb-2 block text-sm font-semibold">Travel business name <span className="text-orange-700">*</span></label><input id="intro-travel" autoComplete="organization" required minLength={2} maxLength={160} value={form.travelName} onChange={e => setForm({ ...form, travelName: e.target.value })} className="premium-input" placeholder="Your travel company or brand name" /></div>
              <div><label htmlFor="intro-address" className="mb-2 block text-sm font-semibold">Company address <span className="font-normal text-slate-500">(optional)</span></label><textarea id="intro-address" autoComplete="street-address" rows={3} maxLength={500} value={form.companyAddress} onChange={e => setForm({ ...form, companyAddress: e.target.value })} className="premium-input resize-y" placeholder="Street, city, state, and postal code" /></div>
              <p className="text-xs leading-6 text-slate-500">These details will be shared with the GoTogether admin team to review your business request.</p>
              <button disabled={submitting} className="gt-button w-full disabled:opacity-60">{submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}{submitting ? 'Submitting…' : 'Submit for admin review'}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
