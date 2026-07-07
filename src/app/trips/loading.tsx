export default function TripsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        {/* Header skeleton */}
        <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse mb-8" />

        {/* Filter bar skeleton */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 mb-8">
          <div className="flex-1 h-10 bg-slate-100 rounded-xl animate-pulse" />
          <div className="w-36 h-10 bg-slate-100 rounded-xl animate-pulse" />
          <div className="w-36 h-10 bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
              <div className="h-52 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 bg-slate-100 rounded-full w-20" />
                  <div className="h-6 bg-slate-100 rounded-full w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
