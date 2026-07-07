export default function TripDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-r-full animate-loading-bar" />
      </div>

      <div className="pt-20 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
          {/* Hero image skeleton */}
          <div className="h-80 w-full bg-slate-200 animate-pulse relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-8">
              <div className="space-y-3 w-full">
                <div className="h-10 w-2/3 bg-white/20 rounded-xl animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-5 w-32 bg-white/20 rounded-full animate-pulse" />
                  <div className="h-5 w-28 bg-white/20 rounded-full animate-pulse" />
                  <div className="h-5 w-36 bg-white/20 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left: Trip Info */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              <div>
                <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>

              {/* Route details skeleton */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse mb-4" />
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-5 bg-orange-200 rounded-full animate-pulse" />
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Booking sidebar */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4">
                <div className="h-7 w-32 bg-slate-200 rounded-lg animate-pulse" />
                <div className="flex items-end gap-2 pb-6 border-b border-slate-100">
                  <div className="h-8 w-24 bg-emerald-100 rounded-lg animate-pulse" />
                  <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-12 w-full bg-orange-200 rounded-xl animate-pulse mt-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
