export default function AdminNodesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/50 rounded mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 bg-slate-800 rounded" />
              <div className="h-6 w-20 bg-slate-800/60 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-800/50 rounded" />
              <div className="h-4 w-32 bg-slate-800/50 rounded" />
            </div>
            <div className="pt-4 flex gap-3">
              <div className="h-9 w-24 bg-slate-800 rounded-xl" />
              <div className="h-9 w-24 bg-slate-800/60 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
