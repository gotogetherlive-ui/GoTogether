export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile card skeleton */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 animate-pulse">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-slate-200 rounded-lg w-48" />
              <div className="h-4 bg-slate-100 rounded-lg w-64" />
              <div className="h-4 bg-slate-100 rounded-lg w-40" />
            </div>
          </div>
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
              <div className="h-8 bg-slate-200 rounded-lg w-12 mb-2" />
              <div className="h-4 bg-slate-100 rounded-lg w-24" />
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded-lg w-1/3" />
                <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
