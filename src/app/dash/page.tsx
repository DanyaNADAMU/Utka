import { auth } from "@/auth"
import db from "@/lib/db"
import { buildClientLink } from "@/lib/xray";
import { getSettings } from "@/lib/settings";
import { trafficState } from "@/lib/trafficDaemon";
import { getDictionary } from "@/i18n/dictionaries";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { QRCodeSVG } from 'qrcode.react'
import { notFound } from "next/navigation"

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const dbUser = await db.user.findUnique({
    where: { authentikId: session.user.id },
    include: { subscriptions: { include: { node: true, inbounds: true, traffic: true } } }
  });

  const dict = await getDictionary();

  if (!dbUser || dbUser.subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
          {dict.dashboard.init_error}
        </div>
      </div>
    );
  }

  const sub = dbUser.subscriptions[0];
  
  // Fetch total traffic from daemon state or fallback to DB
  const stat = trafficState[sub.id];
  const dbUp = sub.traffic?.reduce((acc: bigint, t: any) => acc + t.up, BigInt(0)) || BigInt(0);
  const dbDown = sub.traffic?.reduce((acc: bigint, t: any) => acc + t.down, BigInt(0)) || BigInt(0);
  const totalUp = stat ? stat.totalUp : dbUp;
  const totalDown = stat ? stat.totalDown : dbDown;
  
  // Format bytes helper
  const formatBytes = (bytes: bigint) => {
    if (bytes === BigInt(0)) return '0 B';
    const k = BigInt(1024);
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(Number(k)));
    return parseFloat((Number(bytes) / Math.pow(Number(k), i)).toFixed(2)) + ' ' + sizes[i];
  };

  const inbounds = sub.inbounds || [];
  const vlessLinks = await Promise.all(inbounds.map(async (inbound: any) => {
    const link = await buildClientLink(
      inbound.inboundTag,
      inbound.xrayUuid,
      sub.name || "",
      sub.node.address,
      sub.node.port
    );
    return { tag: inbound.inboundTag, link };
  }));
  
  const settings = await getSettings();
  const subPath = settings.SUB_PATH.replace('[token]', sub.token);
  // Ensure subPath starts with slash
  const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  const subLink = `${process.env.AUTH_URL || 'https://nada.mu'}${safeSubPath}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 flex flex-col items-center selection:bg-emerald-500/30">
      <div className="max-w-5xl w-full space-y-6 md:space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent ml-0 md:ml-2">
            NadamuDash
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full md:w-auto">
            <LanguageSwitcher />
            <span className="text-sm font-medium text-slate-400 truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{session.user.email}</span>
            <a href="/api/auth/signout" className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 ml-auto md:ml-0">
              Выйти
            </a>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Stats & Info */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              
              <h2 className="text-xl font-semibold mb-8 text-slate-200">{dict.dashboard.traffic_usage}</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/80 border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-slate-400 font-medium">{dict.common.downloaded}</span>
                  </div>
                  <span className="font-mono text-lg text-emerald-400 tracking-tight">{formatBytes(totalDown)}</span>
                </div>
                
                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/80 border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                    <span className="text-slate-400 font-medium">{dict.common.uploaded}</span>
                  </div>
                  <span className="font-mono text-lg text-cyan-400 tracking-tight">{formatBytes(totalUp)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-semibold mb-6 text-slate-200">{dict.dashboard.auto_config}</h2>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                {dict.dashboard.auto_config_desc}
              </p>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
                <code className="text-xs text-emerald-400 font-mono whitespace-nowrap select-all">{subLink}</code>
              </div>
            </div>
          </div>

          {/* Right Column: QR Codes */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            
            <h2 className="text-xl font-semibold mb-2 text-slate-200 self-start">{dict.dashboard.title}</h2>
            <p className="text-sm text-slate-400 mb-8 self-start">
              {vlessLinks.length > 0 
                ? dict.dashboard.scan_qr
                : dict.dashboard.init_error}
            </p>
            
            {vlessLinks.length > 0 && (
              <div className="w-full space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {vlessLinks.map((v: any, i: number) => (
                  <div key={i} className="flex flex-col items-center space-y-4 bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                    <span className="text-sm font-semibold text-emerald-400 bg-emerald-400/10 px-4 py-1 rounded-full">{v.tag}</span>
                    <div className="bg-white p-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-transform hover:scale-105 duration-300">
                      <QRCodeSVG value={v.link} size={180} className="rounded-lg" />
                    </div>
                    <div className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden mt-4">
                      <code className="text-xs text-slate-400 font-mono break-all line-clamp-2 select-all hover:line-clamp-none transition-all cursor-pointer">
                        {v.link}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
