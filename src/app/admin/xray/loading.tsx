export default function AdminXrayLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-slate-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-800/50 rounded mt-2" />
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="h-96 w-full bg-slate-950 rounded-xl border border-slate-800" />
        <div className="flex justify-end gap-4">
          <div className="h-10 w-28 bg-slate-800 rounded-xl" />
          <div className="h-10 w-36 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
