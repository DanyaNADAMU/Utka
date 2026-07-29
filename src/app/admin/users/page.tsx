import db from "@/lib/db";
import { getSettings } from "@/lib/settings";
import AdminUsersTable from "@/components/AdminUsersTable";

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

  const subs = subscriptions.map((sub) => {
    const subPath = settings.SUB_PATH.replace('[token]', sub.token);
    const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
    const subLink = `${authUrl}${safeSubPath}`;

    return { 
      id: sub.id,
      name: sub.name,
      token: sub.token,
      user: sub.user,
      subLink
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Пользователи</h1>
        <div className="text-sm text-slate-400">
          Всего подписок: <span className="font-mono text-emerald-400">{subs.length}</span>
        </div>
      </div>
      
      <AdminUsersTable subscriptions={subs} />
      
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p>Статистика трафика синхронизируется сервером в фоновом режиме. Таблица обновляется каждые 5 секунд без дополнительной нагрузки на базу данных или ядро Xray.</p>
      </div>
    </div>
  );
}
