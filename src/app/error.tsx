"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Application render error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-24 text-slate-900">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-500">
          Temporary problem
        </p>
        <h1 className="mb-3 text-3xl font-bold">We couldn&apos;t load this page</h1>
        <p className="mb-8 text-slate-600">
          The service may be restarting or temporarily unavailable. Please try again.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          Try again
        </button>
      </div>
    </main>
  );
}