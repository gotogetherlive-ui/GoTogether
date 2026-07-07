export default function BuddyLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-20">
        {/* Hero skeleton */}
        <div className="h-48 bg-gradient-to-br from-orange-200 to-rose-200 rounded-3xl animate-pulse mb-8" />

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                    <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-slate-100 rounded-lg w-full" />
                <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-9 bg-slate-100 rounded-xl w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
