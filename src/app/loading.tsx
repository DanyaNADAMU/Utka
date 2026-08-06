export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 blur-sm" />
        </div>
        <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
