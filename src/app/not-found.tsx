import { Compass, Home, Map } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_48%)] px-6 py-24'>
      <div className='w-full max-w-xl text-center'>
        <div className='mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/20'>
          <Compass className='h-8 w-8' aria-hidden='true' />
        </div>
        <p className='mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-600'>404 · Route not found</p>
        <h1 className='text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl'>This journey isn&apos;t on the map</h1>
        <p className='mx-auto mt-5 max-w-md text-pretty text-lg leading-8 text-slate-600'>The page may have moved, or the link may be incomplete. Head home or browse available trips.</p>
        <div className='mt-9 flex flex-col justify-center gap-3 sm:flex-row'>
          <Link href='/' className='inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800'>
            <Home className='h-4 w-4' aria-hidden='true' /> Home
          </Link>
          <Link href='/trips' className='inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700'>
            <Map className='h-4 w-4' aria-hidden='true' /> Explore trips
          </Link>
        </div>
      </div>
    </main>
  );
}
