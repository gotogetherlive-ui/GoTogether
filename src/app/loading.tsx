export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation placeholder */}
      <div className="fixed top-0 w-full z-50 px-6 py-4 bg-white/90 backdrop-blur-xl shadow-sm border-b border-white/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="h-8 w-36 bg-slate-200 rounded-lg animate-pulse" />
          <div className="hidden md:flex items-center gap-6">
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-orange-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-r-full animate-loading-bar" />
      </div>

      {/* Page content shimmer */}
      <div className="pt-28 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="space-y-8">
          <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-5 w-96 bg-slate-100 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                <div className="h-64 bg-slate-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
