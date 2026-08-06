export default function AdminSettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-64 bg-slate-800/50 rounded mt-2" />
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-10 w-full bg-slate-950 rounded-xl border border-slate-800" />
          </div>
        ))}
        <div className="h-10 w-32 bg-slate-800 rounded-xl pt-2" />
      </div>
    </div>
  );
}
