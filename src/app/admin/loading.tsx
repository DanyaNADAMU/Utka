export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-8 w-48 bg-slate-800/80 rounded-lg" />
        <div className="h-10 w-32 bg-slate-800/80 rounded-xl" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3"
          >
            <div className="h-4 w-24 bg-slate-800/80 rounded" />
            <div className="h-8 w-36 bg-slate-800/90 rounded-lg" />
            <div className="h-3 w-28 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="h-6 w-40 bg-slate-800/80 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-full bg-slate-800/40 rounded-xl border border-slate-800/30"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
