export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title & Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-8 w-44 bg-slate-800 rounded-lg" />
        <div className="flex items-center gap-4">
          <div className="h-5 w-28 bg-slate-800/60 rounded" />
          <div className="h-10 w-32 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between gap-4">
          <div className="h-5 w-24 bg-slate-800/80 rounded" />
          <div className="h-5 w-32 bg-slate-800/80 rounded" />
          <div className="h-5 w-28 bg-slate-800/80 rounded" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-800/50 rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-800/60 rounded-full" />
              <div className="h-8 w-20 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
