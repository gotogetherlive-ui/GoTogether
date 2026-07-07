export default function StoriesLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-100">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-r-full animate-loading-bar" />
      </div>

      <div className="pt-28 pb-24 px-4 max-w-2xl mx-auto w-full space-y-8">
        {/* Hero Banner Skeleton */}
        <div className="bg-slate-200 animate-pulse rounded-3xl h-44 w-full" />

        {/* Composer Skeleton */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 animate-pulse">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
          </div>
        </div>

        {/* Feed Cards Skeletons */}
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/5" />
              </div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-1/2" />
            <div className="h-48 bg-slate-100 rounded-xl w-full" />
            <div className="flex items-center gap-6 pt-2">
              <div className="h-5 bg-slate-200 rounded w-20" />
              <div className="h-5 bg-slate-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
