import db from "@/lib/db";
import { queryUserStats } from "@/lib/xray";
import { getSettings } from "@/lib/settings";
import CopyButton from "@/components/CopyButton";

// Format bytes helper
const formatBytes = (bytes: bigint) => {
  if (bytes === BigInt(0)) return '0 B';
  const k = BigInt(1024);
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Number(bytes)) / Math.log(Number(k)));
  return parseFloat((Number(bytes) / Math.pow(Number(k), i)).toFixed(2)) + ' ' + sizes[i];
};

export default async function AdminUsersPage() {
  const settings = await getSettings();
  const authUrl = process.env.AUTH_URL || 'https://nada.mu';

  // Fetch all subscriptions with user relation
  const subscriptions = await db.subscription.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch real-time traffic from Xray for each subscription concurrently
  const subsWithStats = await Promise.all(
    subscriptions.map(async (sub) => {
      const stats = await queryUserStats(sub.id);
      
      const subPath = settings.SUB_PATH.replace('[token]', sub.token);
      const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
      const subLink = `${authUrl}${safeSubPath}`;

      return { 
        ...sub, 
        stats,
        subLink
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Пользователи</h1>
        <div className="text-sm text-slate-400">
          Всего подписок: <span className="font-mono text-emerald-400">{subsWithStats.length}</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-slate-800">Пользователь</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-center">Подписка</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-emerald-400">Скачано ↓</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-cyan-400">Отдано ↑</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right">Всего</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {subsWithStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Нет пользователей
                  </td>
                </tr>
              ) : (
                subsWithStats.map((sub) => {
                  const total = sub.stats.down + sub.stats.up;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{sub.user?.email || 'Неизвестно'}</span>
                          <span className="text-xs text-slate-500 font-mono mt-1">{sub.name || 'Default Device'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            ...{sub.token.slice(-8)}
                          </code>
                          <CopyButton text={sub.subLink} iconOnly={true} label="Скопировать ссылку" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400/90">
                        {formatBytes(sub.stats.down)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-cyan-400/90">
                        {formatBytes(sub.stats.up)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-slate-300">
                        {formatBytes(total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p>Статистика трафика берется напрямую из ядра Xray в реальном времени. В случае перезапуска службы Xray (например, при деплое) счетчики будут обнулены, так как они пока не сохраняются в базу данных.</p>
      </div>
    </div>
  );
}
