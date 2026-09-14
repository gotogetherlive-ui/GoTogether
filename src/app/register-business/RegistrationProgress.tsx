import { Check, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function RegistrationProgress({ status }: { status: 'none' | 'pending' | 'approved' | 'rejected' }) {
  const steps = [
    { title: 'Your introduction', description: status === 'none' ? 'Share your business details' : 'Details submitted', icon: FileText, complete: status !== 'none', current: status === 'none' },
    { title: 'Admin review', description: status === 'approved' ? 'Approved to proceed' : status === 'rejected' ? 'Not approved · contact support' : status === 'pending' ? 'Your request is being reviewed' : 'Starts after you submit', icon: ShieldCheck, complete: status === 'approved', current: status === 'pending' || status === 'rejected' },
    { title: 'Full registration', description: status === 'approved' ? 'Unlocked · complete your registration' : 'Unlocks after admin approval', icon: LockKeyhole, complete: false, current: status === 'approved' },
  ];

  return (
    <nav aria-label="Business registration progress" className="my-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">Your registration journey</p>
      <ol className="grid gap-0 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.complete ? Check : step.icon;
          const declined = status === 'rejected' && index === 1;
          return (
            <li key={step.title} aria-current={step.current ? 'step' : undefined} className="relative flex gap-4 pb-7 last:pb-0 sm:block sm:pb-0 sm:pr-3">
              {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 sm:left-10 sm:top-[19px] sm:h-0.5 sm:w-[calc(100%-2.5rem)] ${step.complete ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${step.complete ? 'border-emerald-600 bg-emerald-600 text-white' : declined ? 'border-rose-600 bg-rose-50 text-rose-700' : step.current ? 'border-orange-600 bg-orange-50 text-orange-700 ring-4 ring-orange-100' : 'border-slate-200 bg-white text-slate-400'}`}><Icon aria-hidden="true" className="h-4 w-4" /></span>
              <div className="pt-0.5 sm:mt-4"><p className="text-sm font-semibold text-slate-900">{step.title}</p><p className={`mt-1 text-xs leading-5 ${declined ? 'text-rose-700' : step.current ? 'text-orange-800' : 'text-slate-500'}`}>{step.description}</p>{step.current && <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-slate-600">You are here</span>}</div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
