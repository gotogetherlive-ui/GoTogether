'use client';

import { WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const nextOffline = !navigator.onLine;
      setOffline(nextOffline);
      if (!nextOffline) setDismissed(false);
    };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div role='status' aria-live='polite' className='fixed inset-x-3 bottom-3 z-[200] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-xl shadow-amber-950/10 sm:bottom-5'>
      <WifiOff className='h-5 w-5 shrink-0 text-amber-600' aria-hidden='true' />
      <p className='min-w-0 flex-1'>
        <strong className='font-semibold'>You&apos;re offline.</strong>{' '}
        Changes may not save until your connection returns.
      </p>
      <button type='button' onClick={() => setDismissed(true)} className='-mr-1 rounded-lg p-2 text-amber-700 hover:bg-amber-100' aria-label='Dismiss offline notice'>
        <X className='h-4 w-4' aria-hidden='true' />
      </button>
    </div>
  );
}
