export default function DashLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 flex flex-col items-center animate-pulse">
      <div className="max-w-5xl w-full space-y-6 md:space-y-8">
        {/* Header Skeleton */}
        <header className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="h-7 w-36 bg-slate-800 rounded-lg" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-20 bg-slate-800 rounded-lg" />
            <div className="h-8 w-32 bg-slate-800 rounded-lg" />
            <div className="h-9 w-20 bg-slate-800 rounded-xl" />
          </div>
        </header>

        {/* Main Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="h-6 w-40 bg-slate-800 rounded-md" />
              <div className="space-y-4">
                <div className="h-16 w-full bg-slate-950/80 rounded-2xl border border-slate-800/50" />
                <div className="h-16 w-full bg-slate-950/80 rounded-2xl border border-slate-800/50" />
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="h-6 w-48 bg-slate-800 rounded-md" />
              <div className="h-4 w-full bg-slate-800/50 rounded" />
              <div className="h-12 w-full bg-slate-950 rounded-xl border border-slate-800" />
            </div>
          </div>

          {/* Right Column (QR Codes) */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 flex flex-col items-center">
            <div className="h-6 w-40 bg-slate-800 rounded-md self-start" />
            <div className="h-4 w-64 bg-slate-800/50 rounded self-start" />
            <div className="w-full h-64 bg-slate-950/50 rounded-2xl border border-slate-800 flex items-center justify-center">
              <div className="w-44 h-44 bg-slate-800/80 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
